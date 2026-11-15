import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { ActionButton } from '../components/ActionButton';
import { Avatar } from '../components/Avatar';
import { Student, Teacher } from '../models/types';
import { listStudents } from '../services/studentService';
import { updateTeacherPhoto } from '../services/teacherService';
import { colors, shared } from '../styles';

// Recebe o professor da sessão para exibir e atualizar seu avatar sem duplicar a fonte de dados.
type Props = NativeStackScreenProps<RootStackParamList, 'Students'> & { teacher: Teacher; onTeacherChange: (teacher: Teacher) => void; onLogout: () => Promise<void> };

export function StudentsScreen({ teacher, onTeacherChange, onLogout }: Props): React.JSX.Element {
  // Estados separados permitem mostrar carregamento, falha e ações da foto independentemente.
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoNotice, setPhotoNotice] = useState('');
  const [cameraSettings, setCameraSettings] = useState(false);
  const [showTeacherActions, setShowTeacherActions] = useState(false);

  // A câmera pede permissão; a galeria usa o seletor nativo para compartilhar só a imagem escolhida.
  const changeTeacherPhoto = async (source: 'camera' | 'gallery'): Promise<void> => {
    setPhotoBusy(true);
    setPhotoNotice('');
    setCameraSettings(false);
    try {
      if (source === 'camera') {
        let permission = await ImagePicker.getCameraPermissionsAsync();
        if (!permission.granted && permission.canAskAgain) permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setCameraSettings(!permission.canAskAgain);
          setPhotoNotice('A câmera precisa de permissão para fotografar o professor. Você ainda pode escolher uma foto da galeria.');
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 };
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets[0]?.uri) return;
      const saved = await updateTeacherPhoto(teacher.code, result.assets[0].uri);
      if (saved.ok) onTeacherChange(saved.data);
      else setPhotoNotice(saved.message);
    } catch {
      setPhotoNotice('Não foi possível abrir a câmera ou a galeria. Tente novamente.');
    } finally {
      setPhotoBusy(false);
    }
  };

  // A remoção atualiza o cadastro e o avatar da sessão pelo mesmo serviço.
  const removeTeacherPhoto = async (): Promise<void> => {
    setPhotoBusy(true);
    setPhotoNotice('');
    const saved = await updateTeacherPhoto(teacher.code, null);
    if (saved.ok) onTeacherChange(saved.data);
    else setPhotoNotice(saved.message);
    setPhotoBusy(false);
  };

  // Recarrega a lista ao voltar do cadastro, edição ou exclusão.
  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    const result = await listStudents();
    if (result.ok) setStudents(result.data);
    else setError(result.message);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback((): void => { void reload(); }, [reload]));

  // Cada cartão mostra um estudante e usa seu ID estável como chave da lista.
  const renderItem = ({ item }: { item: Student }): React.JSX.Element => (
    <View style={shared.card}>
      <View style={styles.studentRow}>
        <Avatar name={item.name} photoUri={item.photoUri} />
        <View style={styles.studentInfo}>
          <Text style={styles.id}>ID: {item.id}</Text>
          <Text style={styles.studentName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.studentMeta} numberOfLines={2}>{item.className} · {item.stage}</Text>
        </View>
        <Text style={[styles.statusBadge, item.statusTone === 'alert' ? styles.statusAlert : item.statusTone === 'success' ? styles.statusSuccess : styles.statusProgress]} numberOfLines={1}>{item.statusLabel ?? 'Em acompanhamento'}</Text>
      </View>
      <View style={styles.skillRow}><Ionicons name="book-outline" size={17} color={colors.primaryDark} /><Text style={styles.skillText}>BNCC: {item.bnccSkill ?? 'A definir'}</Text><Text style={styles.resultText} numberOfLines={1}>{item.resultSummary ?? 'Cadastro local'}</Text></View>
    </View>
  );

  // O perfil e o resumo ficam dentro do cabeçalho da FlatList para rolar junto aos alunos.
  const header = (): React.JSX.Element => (
    <View>
      <View style={[shared.card, styles.teacherCard]}>
        <View style={styles.studentRow}>
          <Avatar name={teacher.name} photoUri={teacher.photoUri} />
          <View style={styles.studentInfo}>
            <Text style={styles.id}>EDUCADOR CONECTADO</Text>
            <Text style={styles.teacherName} numberOfLines={1}>{teacher.name}</Text>
            <Text style={styles.studentMeta}>{teacher.code} · Perfil docente</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Editar foto e conta do professor" onPress={(): void => setShowTeacherActions((current): boolean => !current)} style={styles.teacherEdit}><Ionicons name={showTeacherActions ? 'close-outline' : 'camera-outline'} size={21} color={colors.primaryDark} /></Pressable>
        </View>
        {showTeacherActions ? <View style={styles.teacherActions}>
          <Text style={shared.body}>Foto opcional salva neste aparelho.</Text>
          <ActionButton title={photoBusy ? 'Aguarde...' : 'Tirar foto'} icon="camera-outline" secondary onPress={(): void => { void changeTeacherPhoto('camera'); }} disabled={photoBusy} />
          <ActionButton title="Escolher da galeria" icon="images-outline" secondary onPress={(): void => { void changeTeacherPhoto('gallery'); }} disabled={photoBusy} />
          <Text style={styles.photoPermissionHint}>A câmera solicita autorização se necessário; a galeria compartilha apenas a foto escolhida no seletor do sistema.</Text>
          {teacher.photoUri ? <ActionButton title="Remover foto" icon="trash-outline" secondary onPress={(): void => { void removeTeacherPhoto(); }} disabled={photoBusy} /> : null}
          {photoNotice ? <Text style={shared.error}>{photoNotice}</Text> : null}
          {cameraSettings ? <ActionButton title="Abrir configurações" secondary onPress={(): void => { void Linking.openSettings(); }} /> : null}
          <ActionButton title="Sair da conta" icon="log-out-outline" secondary onPress={(): void => { void onLogout(); }} />
        </View> : null}
      </View>
      <View style={[shared.card, styles.reminderCard]}><View style={styles.infoHeader}><View style={styles.infoIcon}><Ionicons name="notifications-outline" size={20} color={colors.primaryDark} /></View><Text style={styles.infoTitle}>Notificações locais</Text><Text style={styles.infoBadge}>Disponível</Text></View><Text style={shared.body}>Defina data e horário para revisar o acompanhamento de cada estudante nos detalhes do registro.</Text></View>
      <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Estudantes acompanhados</Text><Text style={styles.sectionCaption}>Dados de demonstração e cadastros locais</Text></View><Text style={styles.countBadge}>{students.length} registros</Text></View>
    </View>
  );

  // A mesma área cobre os três estados sem deixar uma tela branca em caso de falha.
  const empty = (): React.JSX.Element => {
    if (loading) return <View style={shared.card}><ActivityIndicator color={colors.primary} /><Text style={[shared.body, { textAlign: 'center', marginTop: 10 }]}>Carregando estudantes...</Text></View>;
    if (error) return <View style={shared.card}><Text style={shared.heading}>Não foi possível carregar</Text><Text style={shared.body}>{error}</Text><ActionButton title="Tentar novamente" onPress={(): void => { void reload(); }} /></View>;
    return <View style={shared.card}><Text style={shared.heading}>Nenhum estudante ainda</Text><Text style={shared.body}>Cadastre o primeiro estudante para começar.</Text></View>;
  };

  return (
    <View style={shared.page}>
      {/* FlatList virtualiza os cartões; o ID único evita confusão ao editar ou excluir. */}
      <FlatList<Student>
        style={shared.page}
        data={loading || error ? [] : students}
        keyExtractor={(item: Student): string => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, width: '100%', maxWidth: 600, alignSelf: 'center' },
  teacherCard: { backgroundColor: '#F0F2FF' },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  studentInfo: { flex: 1, minWidth: 0 },
  id: { color: colors.primaryDark, fontSize: 11, fontWeight: '700', marginBottom: 2 },
  teacherName: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 2 },
  studentName: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 2 },
  studentMeta: { color: colors.muted, fontSize: 12, lineHeight: 16 },
  statusBadge: { maxWidth: 108, overflow: 'hidden', fontSize: 10, fontWeight: '700', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 5 },
  statusAlert: { color: '#A52B26', backgroundColor: '#FFE2DF' },
  statusProgress: { color: '#8B5100', backgroundColor: colors.amberSoft },
  statusSuccess: { color: '#006B47', backgroundColor: '#BFF8DF' },
  skillRow: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F0F2FF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, marginTop: 14 },
  skillText: { color: colors.text, fontSize: 12 },
  resultText: { color: colors.primaryDark, fontSize: 11, fontWeight: '700', flex: 1, textAlign: 'right' },
  teacherEdit: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#E4E9FF', alignItems: 'center', justifyContent: 'center' },
  teacherActions: { marginTop: 14, borderTopWidth: 1, borderTopColor: '#DDE3F7', paddingTop: 12 },
  photoPermissionHint: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 8 },
  reminderCard: { padding: 16 },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 },
  infoIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E7EDFF', alignItems: 'center', justifyContent: 'center' },
  infoTitle: { color: colors.text, fontSize: 15, fontWeight: '700', flex: 1 },
  infoBadge: { color: colors.amber, backgroundColor: colors.amberSoft, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6, marginBottom: 14 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  sectionCaption: { color: colors.muted, fontSize: 11, marginTop: 3 },
  countBadge: { color: colors.primaryDark, backgroundColor: colors.soft, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 5, fontSize: 10, fontWeight: '700' },
});
