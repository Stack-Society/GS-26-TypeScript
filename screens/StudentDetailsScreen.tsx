import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import type { RootStackParamList } from '../App';
import { ActionButton } from '../components/ActionButton';
import { Avatar } from '../components/Avatar';
import { Student } from '../models/types';
import { deleteStudent, getStudent, isInitialStudent, updateStudentPhoto } from '../services/studentService';
import { colors, shared } from '../styles';

// A rota traz somente o ID para evitar passar um estudante desatualizado entre telas.
type Props = NativeStackScreenProps<RootStackParamList, 'StudentDetails'>;

// Define como mostrar o lembrete quando o aplicativo estiver aberto.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

// Sugere um horário futuro próximo sem agendar nada automaticamente.
function initialReminderDate(): Date {
  const date = new Date(Date.now() + 5 * 60_000);
  date.setSeconds(0, 0);
  return date;
}

// Apresenta a escolha no formato local antes e depois do agendamento.
function formatReminderDate(date: Date): string {
  return date.toLocaleString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function StudentDetailsScreen({ navigation, route }: Props): React.JSX.Element {
  // Estados isolam falhas de foto, permissão, data e exclusão para mensagens específicas.
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [errorDetails, setErrorDetails] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoNotice, setPhotoNotice] = useState('');
  const [cameraSettings, setCameraSettings] = useState(false);
  const [reminderAt, setReminderAt] = useState<Date>(initialReminderDate);
  const [dateError, setDateError] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Reconsulta o estudante ao voltar da edição e ignora respostas após perder o foco.
  useFocusEffect(useCallback((): (() => void) => {
    let active = true;
    setLoading(true);
    void getStudent(route.params.studentId).then((result): void => {
      if (!active) return;
      if (result.ok) {
        setStudent(result.data);
        setError('');
      } else {
        setStudent(null);
        setError(result.message);
      }
    }).finally((): void => { if (active) setLoading(false); });
    return (): void => { active = false; };
  }, [route.params.studentId]));

  // Solicita acesso à câmera quando preciso e usa o seletor da galeria sem permissão ampla.
  const changePhoto = async (source: 'camera' | 'gallery'): Promise<void> => {
    if (!student) return;
    setPhotoBusy(true);
    setPhotoNotice('');
    setCameraSettings(false);
    try {
      if (source === 'camera') {
        let permission = await ImagePicker.getCameraPermissionsAsync();
        if (!permission.granted && permission.canAskAgain) permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setCameraSettings(!permission.canAskAgain);
          setPhotoNotice('A câmera precisa de permissão para fotografar o estudante. Você ainda pode escolher uma imagem da galeria.');
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 };
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets[0]?.uri) return;
      const saved = await updateStudentPhoto(student.id, result.assets[0].uri);
      if (saved.ok) setStudent(saved.data);
      else setPhotoNotice(saved.message);
    } catch {
      setPhotoNotice('Não foi possível abrir a câmera ou a galeria. Tente novamente.');
    } finally {
      setPhotoBusy(false);
    }
  };

  // A remoção passa pelo serviço para limpar também o arquivo persistido.
  const removePhoto = async (): Promise<void> => {
    if (!student) return;
    setPhotoBusy(true);
    setPhotoNotice('');
    const saved = await updateStudentPhoto(student.id, null);
    if (saved.ok) setStudent(saved.data);
    else setPhotoNotice(saved.message);
    setPhotoBusy(false);
  };

  // O seletor nativo altera apenas a data, preservando a hora já escolhida.
  const openReminderDate = (): void => {
    DateTimePickerAndroid.open({
      value: reminderAt,
      mode: 'date',
      minimumDate: new Date(),
      onValueChange: (_event, selectedDate): void => {
        setReminderAt((current): Date => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), current.getHours(), current.getMinutes()));
        setDateError('');
      },
    });
  };

  // O seletor de hora preserva o dia para compor um único instante de aviso.
  const openReminderTime = (): void => {
    DateTimePickerAndroid.open({
      value: reminderAt,
      mode: 'time',
      is24Hour: true,
      onValueChange: (_event, selectedTime): void => {
        setReminderAt((current): Date => new Date(current.getFullYear(), current.getMonth(), current.getDate(), selectedTime.getHours(), selectedTime.getMinutes()));
        setDateError('');
      },
    });
  };

  // Valida o instante, prepara o canal Android e só agenda após conferir a permissão.
  const scheduleReminder = async (): Promise<void> => {
    if (!student) return;
    if (!Number.isFinite(reminderAt.getTime()) || reminderAt.getTime() <= Date.now() + 30_000) {
      setDateError('Escolha uma data e horário futuros, com pelo menos 30 segundos de antecedência.');
      return;
    }
    setDateError('');
    setBusy(true);
    setNotice('');
    setErrorDetails('');
    setPermissionDenied(false);
    // A etapa atual gera uma mensagem de erro útil caso uma chamada nativa falhe.
    let step = 'preparar notificações';
    let channelId: string | undefined;
    let channelError = '';
    try {
      if (Platform.OS === 'android') {
        step = 'criar o canal no Android';
        try {
          const channel = await Notifications.setNotificationChannelAsync('acompanhamento', { name: 'Lembretes pedagógicos', importance: AndroidImportance.DEFAULT });
          if (channel) channelId = 'acompanhamento';
        } catch (caught: unknown) {
          // Se este canal falhar no Expo Go, tenta agendar pelo canal padrão.
          channelError = caught instanceof Error ? caught.message : String(caught);
        }
      }
      step = 'consultar a permissão';
      let permission = await Notifications.getPermissionsAsync();
      if (!permission.granted && permission.canAskAgain) {
        step = 'solicitar a permissão';
        permission = await Notifications.requestPermissionsAsync();
      }
      if (!permission.granted) {
        setPermissionDenied(true);
        setNotice('As notificações estão desativadas. Ative a permissão nas configurações do aplicativo.');
        return;
      }
      if (Platform.OS === 'android' && channelId) {
        step = 'verificar o canal no Android';
        const channel = await Notifications.getNotificationChannelAsync(channelId);
        if (channel?.importance === AndroidImportance.NONE) {
          setPermissionDenied(true);
          setNotice('O canal de lembretes está desativado. Ative-o nas configurações do aplicativo.');
          return;
        }
      }
      step = 'agendar o lembrete';
      // O ID nos dados da notificação permite cancelá-la ao excluir o estudante.
      const identifier = await Notifications.scheduleNotificationAsync({
        content: { title: 'Lembrete pedagógico', body: `Revisar o acompanhamento de ${student.name}.`, sound: 'default', data: { studentId: student.id } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderAt, ...(channelId ? { channelId } : {}) },
      });
      setNotice(`Lembrete agendado para ${formatReminderDate(reminderAt)} (código ${identifier.slice(0, 8)}).`);
    } catch (caught: unknown) {
      const details = caught instanceof Error ? caught.message : String(caught);
      setNotice(`Não foi possível ${step}.`);
      setErrorDetails(channelError ? `${details}\nFalha anterior ao criar o canal: ${channelError}` : details);
    } finally {
      setBusy(false);
    }
  };

  // A confirmação evita apagar um cadastro por toque acidental.
  const confirmDeletion = (): void => {
    if (!student || isInitialStudent(student.id)) return;
    Alert.alert(
      'Excluir estudante?',
      `O cadastro de ${student.name} e sua foto serão removidos deste aparelho. Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: (): void => {
            setDeleteBusy(true);
            setDeleteError('');
            void deleteStudent(student.id).then((result): void => {
              if (result.ok) navigation.goBack();
              else setDeleteError(result.message);
            }).finally((): void => setDeleteBusy(false));
          },
        },
      ],
    );
  };

  if (loading) return <View style={[shared.page, { justifyContent: 'center' }]}><ActivityIndicator color={colors.primary} /></View>;
  if (!student) return <View style={[shared.page, shared.content]}><Text style={shared.heading}>Estudante indisponível</Text><Text style={shared.body}>{error}</Text></View>;

  return (
    <ScrollView style={shared.page} contentContainerStyle={[shared.content, styles.content, { paddingBottom: 36 + insets.bottom }]}>
      <View style={styles.routeRow}><Text style={styles.routeLabel}>IDENTIFICADOR DE ROTA</Text><View style={styles.idPill}><Ionicons name="id-card-outline" size={15} color={colors.primaryDark} /><Text style={styles.idText}>{student.id}</Text></View></View>
      <View style={shared.card}>
        <View style={styles.profileRow}>
          <Avatar name={student.name} photoUri={student.photoUri} large />
          <View style={styles.profileText}><View style={styles.profileBadges}><Text style={styles.enrollmentBadge}>Matrícula {student.id}</Text><Text style={styles.activeBadge}>Ativo</Text></View><Text style={styles.profileName}>{student.name}</Text><Text style={styles.profileMeta}>{student.className} · {student.stage}</Text></View>
        </View>
        <View style={[styles.profileData, width < 380 ? styles.profileDataNarrow : null]}>
          <View style={styles.dataCell}><Text style={styles.dataLabel}>Turma / Período</Text><Text style={styles.dataValue}>{student.className}</Text></View>
          <View style={styles.dataCell}><Text style={styles.dataLabel}>Ciclo Letivo</Text><Text style={styles.dataValue}>{student.stage}</Text></View>
        </View>
      </View>
      <View style={shared.card}>
        <View style={styles.sectionHeading}><View style={styles.sectionIcon}><Ionicons name="book-outline" size={19} color={colors.primaryDark} /></View><View style={{ flex: 1 }}><Text style={shared.heading}>Acompanhamento Pedagógico</Text><Text style={shared.body}>Registro e plano individual demonstrativos</Text></View></View>
        <View style={styles.statusPanel}><Text style={styles.statusTitle}>STATUS ATUAL</Text><Text style={styles.statusText}>{student.statusLabel ?? 'Em acompanhamento inicial'}</Text></View>
        <View style={styles.timelineRow}><View style={styles.timelineIcon}><Ionicons name="trending-up-outline" size={18} color={colors.success} /></View><View style={styles.timelineBody}><Text style={styles.timelineTitle}>Último registro de evolução</Text><Text style={styles.timelineText}>{student.observation}</Text></View></View>
        {student.goal ? <View style={styles.timelineRow}><View style={[styles.timelineIcon, { backgroundColor: colors.soft }]}><Ionicons name="radio-button-on-outline" size={18} color={colors.primaryDark} /></View><View style={styles.timelineBody}><Text style={styles.timelineTitle}>Meta pedagógica cadastrada</Text><Text style={styles.timelineText}>{student.goal}</Text>{typeof student.progressPercent === 'number' ? <><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, student.progressPercent))}%` }]} /></View><Text style={styles.progressCaption}>{student.progressPercent}% do ciclo atingido</Text></> : null}</View></View> : null}
        {student.bnccSkill ? <View style={styles.bnccRow}><Ionicons name="school-outline" size={17} color={colors.primaryDark} /><Text style={styles.bnccText}>Habilidade BNCC: {student.bnccSkill}</Text></View> : null}
      </View>
      <View style={[shared.card, styles.photoCard]}>
        <View style={styles.photoHeading}><View style={styles.photoIcon}><Ionicons name="camera-outline" size={22} color={colors.primaryDark} /></View><View style={{ flex: 1 }}><Text style={styles.photoTitle}>Foto de identificação</Text><Text style={shared.body}>Opcional. Aparece no avatar do estudante.</Text></View></View>
        <View style={styles.photoButtons}><View style={{ flex: 1 }}><ActionButton title={photoBusy ? 'Aguarde...' : 'Tirar foto'} icon="camera-outline" secondary onPress={(): void => { void changePhoto('camera'); }} disabled={photoBusy} /></View><View style={{ flex: 1 }}><ActionButton title="Galeria" icon="images-outline" secondary onPress={(): void => { void changePhoto('gallery'); }} disabled={photoBusy} /></View></View>
        <Text style={styles.photoPermissionHint}>A câmera solicita autorização se necessário; a galeria abre o seletor do sistema sem acesso a todas as suas fotos.</Text>
        {student.photoUri ? <ActionButton title="Remover foto" icon="trash-outline" secondary onPress={(): void => { void removePhoto(); }} disabled={photoBusy} /> : null}
        {photoNotice ? <Text style={shared.error}>{photoNotice}</Text> : null}
        {cameraSettings ? <ActionButton title="Abrir configurações do dispositivo" secondary onPress={(): void => { void Linking.openSettings(); }} /> : null}
      </View>
      <View style={shared.card}>
        <View style={styles.sectionHeading}><View style={styles.sectionIcon}><Ionicons name="notifications-outline" size={19} color={colors.primaryDark} /></View><View style={{ flex: 1 }}><Text style={shared.heading}>Lembrete de acompanhamento</Text></View></View>
        <Text style={shared.body}>Escolha quando deseja revisar este estudante. O aplicativo precisa da permissão para enviar uma notificação local.</Text>
        {Platform.OS === 'android' ? <>
          <ActionButton title="Escolher data" secondary onPress={openReminderDate} disabled={busy} />
          <ActionButton title="Escolher horário" secondary onPress={openReminderTime} disabled={busy} />
        </> : <DateTimePicker value={reminderAt} mode="datetime" display="spinner" locale="pt-BR" minimumDate={new Date()} onValueChange={(_event, date): void => { setReminderAt(date); setDateError(''); }} style={styles.datePicker} />}
        <Text style={styles.selectedDate}>Selecionado: {formatReminderDate(reminderAt)}</Text>
        {dateError ? <Text style={shared.error}>{dateError}</Text> : null}
        <ActionButton title={busy ? 'Aguarde...' : 'Criar lembrete'} icon="notifications-outline" onPress={(): void => { void scheduleReminder(); }} disabled={busy} />
        {notice ? <Text style={[shared.body, { marginTop: 14, color: permissionDenied || errorDetails ? colors.error : colors.success }]}>{notice}</Text> : null}
        {errorDetails ? <Text selectable style={[shared.body, { marginTop: 8, fontSize: 12 }]}>Detalhe para diagnóstico: {errorDetails}</Text> : null}
        {permissionDenied ? <ActionButton title="Abrir configurações do dispositivo" secondary onPress={(): void => { void Linking.openSettings(); }} /> : null}
      </View>
      {/* Os exemplos não exibem exclusão; o serviço repete essa proteção. */}
      {!isInitialStudent(student.id) ? <View style={shared.card}>
        <Text style={shared.heading}>Gerenciar cadastro</Text>
        <Text style={shared.body}>Exclua este estudante cadastrado no aplicativo se o registro não for mais necessário.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Excluir ${student.name}`} accessibilityState={{ disabled: deleteBusy || photoBusy || busy }} disabled={deleteBusy || photoBusy || busy} onPress={confirmDeletion} style={[styles.deleteButton, deleteBusy || photoBusy || busy ? styles.deleteButtonDisabled : null]}>
          <Ionicons name="trash-outline" size={18} color={colors.error} />
          <Text style={styles.deleteButtonText}>{deleteBusy ? 'Excluindo...' : 'Excluir estudante'}</Text>
        </Pressable>
        {deleteError ? <Text style={shared.error}>{deleteError}</Text> : null}
      </View> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 600, alignSelf: 'center' },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  routeLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', maxWidth: 112 },
  idPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.soft, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 8, flexShrink: 1 },
  idText: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileText: { flex: 1, minWidth: 0 },
  profileBadges: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginBottom: 4 },
  enrollmentBadge: { color: colors.muted, backgroundColor: colors.soft, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontWeight: '700' },
  activeBadge: { color: colors.success, backgroundColor: '#C5F8E2', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontWeight: '700' },
  profileName: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 3 },
  profileMeta: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  profileData: { flexDirection: 'row', gap: 12, backgroundColor: '#F1F2FF', borderRadius: 12, padding: 14, marginTop: 20 },
  profileDataNarrow: { flexDirection: 'column' },
  dataCell: { flex: 1, minWidth: 0 },
  dataLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  dataValue: { color: colors.text, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  statusPanel: { backgroundColor: '#F0F2FF', borderRadius: 12, padding: 14, marginBottom: 18 },
  statusTitle: { color: colors.amber, fontSize: 11, fontWeight: '700', marginBottom: 6 },
  statusText: { color: colors.text, fontSize: 14, fontWeight: '700', backgroundColor: colors.blueSoft, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 8, overflow: 'hidden' },
  timelineRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  timelineIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#C5F8E2', alignItems: 'center', justifyContent: 'center' },
  timelineBody: { flex: 1, minWidth: 0 },
  timelineTitle: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 5 },
  timelineText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  progressTrack: { height: 8, borderRadius: 5, backgroundColor: colors.soft, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 5, backgroundColor: colors.primaryDark },
  progressCaption: { color: colors.primaryDark, fontSize: 11, fontWeight: '700', marginTop: 5 },
  bnccRow: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#F1F2FF', borderRadius: 10, padding: 10 },
  bnccText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  photoCard: { backgroundColor: '#EEF0FF' },
  photoHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photoIcon: { backgroundColor: colors.surface, width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  photoTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 2 },
  photoButtons: { flexDirection: 'row', gap: 8, marginTop: 12 },
  photoPermissionHint: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 10 },
  datePicker: { height: 190, width: '100%' },
  selectedDate: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 14, marginBottom: 8 },
  deleteButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.error, borderRadius: 12, marginTop: 16, paddingHorizontal: 16 },
  deleteButtonDisabled: { opacity: 0.6 },
  deleteButtonText: { color: colors.error, fontSize: 16, fontWeight: '700', textAlign: 'center' },
});
