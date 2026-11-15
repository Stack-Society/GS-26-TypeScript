import { useRef, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TextInputInstance, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { ActionButton } from '../components/ActionButton';
import { FormField } from '../components/FormField';
import { Avatar } from '../components/Avatar';
import { NewStudent } from '../models/types';
import { createStudent } from '../services/studentService';
import { colors, shared } from '../styles';
import { FieldErrors, validateStudent } from '../utils/validation';
import { useKeyboardForm } from '../utils/useKeyboardForm';

// A rota de cadastro não recebe um aluno: começa com um formulário vazio.
type Props = NativeStackScreenProps<RootStackParamList, 'NewStudent'>;

export function NewStudentScreen({ navigation }: Props): React.JSX.Element {
  // O objeto único reúne os campos a validar e os estados auxiliares tratam operações nativas.
  const [student, setStudent] = useState<NewStudent>({ id: '', name: '', className: '', schoolYear: '', observation: '' });
  const [errors, setErrors] = useState<FieldErrors<NewStudent>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMessage, setPhotoMessage] = useState('');
  const [cameraSettings, setCameraSettings] = useState(false);
  const nameRef = useRef<TextInputInstance>(null);
  const idRef = useRef<TextInputInstance>(null);
  const classRef = useRef<TextInputInstance>(null);
  const yearRef = useRef<TextInputInstance>(null);
  const observationRef = useRef<TextInputInstance>(null);
  const insets = useSafeAreaInsets();
  const { scrollRef, keyboardHeight, onScroll, onFieldFocus, onContentSizeChange } = useKeyboardForm();

  // Atualiza um campo sem perder os outros valores já digitados.
  const change = (field: keyof NewStudent, value: string): void => {
    setStudent((current): NewStudent => ({ ...current, [field]: value }));
  };

  // A foto é opcional e só é copiada para armazenamento permanente ao salvar o aluno.
  const choosePhoto = async (source: 'camera' | 'gallery'): Promise<void> => {
    Keyboard.dismiss();
    setPhotoBusy(true);
    setPhotoMessage('');
    setCameraSettings(false);
    try {
      if (source === 'camera') {
        let permission = await ImagePicker.getCameraPermissionsAsync();
        if (!permission.granted && permission.canAskAgain) permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setCameraSettings(!permission.canAskAgain);
          setPhotoMessage('A câmera precisa de permissão. Você ainda pode escolher uma foto da galeria.');
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 };
      const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets[0]?.uri) change('photoUri', result.assets[0].uri);
    } catch {
      setPhotoMessage('Não foi possível abrir a câmera ou a galeria. Tente novamente.');
    } finally {
      setPhotoBusy(false);
    }
  };

  // Mostra erros por campo antes de persistir e foca o primeiro campo inválido.
  const save = async (): Promise<void> => {
    const nextErrors = validateStudent(student);
    setErrors(nextErrors);
    setMessage('');
    if (Object.keys(nextErrors).length > 0) {
      const firstInvalid = nextErrors.name ? nameRef : nextErrors.id ? idRef : nextErrors.className ? classRef : yearRef;
      firstInvalid.current?.focus();
      return;
    }
    setBusy(true);
    const result = await createStudent(student);
    setBusy(false);
    if (result.ok) {
      Keyboard.dismiss();
      navigation.goBack();
      Alert.alert('Cadastro concluído', `${result.data.name} já aparece na lista de estudantes.`);
    } else {
      Keyboard.dismiss();
      setMessage(result.message);
    }
  };

  return (
    <KeyboardAvoidingView style={shared.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Espaço extra e foco controlado deixam o formulário acessível com o teclado aberto. */}
      <ScrollView ref={scrollRef} onScroll={onScroll} scrollEventThrottle={16} onContentSizeChange={onContentSizeChange} contentContainerStyle={[shared.content, styles.content, { paddingBottom: 36 + insets.bottom + (Platform.OS === 'android' ? keyboardHeight : 0) }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" scrollsChildToFocus>
        <View style={styles.stepRow}><Text style={styles.step}>ETAPA 1 DE 1</Text><Text style={styles.stepText}>• Turma & Identificação</Text><Text style={styles.localReady}>● Banco local pronto</Text></View>
        <Text style={shared.subtitle}>Preencha os dados fictícios do estudante para iniciar o acompanhamento pedagógico.</Text>
        <View style={[shared.card, styles.photoCard]}><Avatar name={student.name || 'Estudante'} photoUri={student.photoUri} large /><View style={{ flex: 1 }}><Text style={styles.photoTitle}>Foto de Identificação</Text><Text style={shared.body}>Opcional. Auxilia na associação rápida da turma.</Text></View></View>
        <View style={styles.photoActions}><View style={{ flex: 1 }}><ActionButton title={photoBusy ? 'Aguarde...' : 'Câmera'} icon="camera-outline" secondary onPress={(): void => { void choosePhoto('camera'); }} disabled={photoBusy} /></View><View style={{ flex: 1 }}><ActionButton title="Galeria" icon="images-outline" secondary onPress={(): void => { void choosePhoto('gallery'); }} disabled={photoBusy} /></View></View>
        <Text style={styles.photoPermissionHint}>A câmera solicita autorização se ainda não foi concedida. A galeria compartilha apenas a foto escolhida no seletor do sistema.</Text>
        {student.photoUri ? <ActionButton title="Remover foto" icon="trash-outline" secondary onPress={(): void => setStudent((current): NewStudent => ({ ...current, photoUri: undefined }))} /> : null}
        {photoMessage ? <Text style={shared.error}>{photoMessage}</Text> : null}
        {cameraSettings ? <ActionButton title="Abrir configurações" secondary onPress={(): void => { void Linking.openSettings(); }} /> : null}
        <View style={styles.formFields}>
          <FormField ref={nameRef} icon="person-outline" label="Nome Completo do Estudante *" value={student.name} onChangeText={(value): void => change('name', value)} onFocus={(): void => onFieldFocus(nameRef)} onSubmitEditing={(): void => idRef.current?.focus()} returnKeyType="next" placeholder="Ex.: Mariana Costa Ferreira" error={errors.name} />
          <FormField ref={idRef} icon="id-card-outline" label="Código de Identificação Único *" value={student.id} onChangeText={(value): void => change('id', value)} onFocus={(): void => onFieldFocus(idRef)} onSubmitEditing={(): void => classRef.current?.focus()} returnKeyType="next" autoCapitalize="characters" autoCorrect={false} placeholder="Ex.: EST-0104" error={errors.id} />
          <Text style={styles.helper}><Ionicons name="information-circle-outline" size={13} color={colors.primaryDark} /> Código único para este aparelho.</Text>
          <FormField ref={classRef} icon="people-outline" label="Turma *" value={student.className} onChangeText={(value): void => change('className', value)} onFocus={(): void => onFieldFocus(classRef)} onSubmitEditing={(): void => yearRef.current?.focus()} returnKeyType="next" placeholder="Ex.: 7º ano B (Matutino)" error={errors.className} />
          <FormField ref={yearRef} icon="school-outline" label="Ano Escolar *" value={student.schoolYear} onChangeText={(value): void => change('schoolYear', value)} onFocus={(): void => onFieldFocus(yearRef)} onSubmitEditing={(): void => observationRef.current?.focus()} returnKeyType="next" placeholder="Ex.: 7 ou 7º ano" error={errors.schoolYear} />
          <Text style={shared.label}>Observação Inicial de Acompanhamento <Text style={styles.optional}>Opcional</Text></Text>
          <TextInput ref={observationRef} accessibilityLabel="Observação Inicial de Acompanhamento" value={student.observation} onChangeText={(value): void => change('observation', value)} onFocus={(): void => onFieldFocus(observationRef)} multiline textAlignVertical="top" placeholder="Ex.: Demonstra facilidade em raciocínio lógico e precisa de apoio na interpretação de textos..." placeholderTextColor="#98A0B2" style={styles.observationInput} />
          <Text style={styles.helper}>As observações ajudam a orientar o acompanhamento individual.</Text>
          {message ? <Text style={shared.error}>{message}</Text> : null}
        </View>
        <View style={styles.infoCard}><View style={styles.infoIcon}><Ionicons name="school-outline" size={21} color={colors.primaryDark} /></View><View style={{ flex: 1 }}><Text style={styles.infoTitle}>Cadastro local</Text><Text style={shared.body}>O estudante será salvo neste aparelho. Habilidades e metas poderão ser acompanhadas no perfil.</Text></View></View>
        <ActionButton title={busy ? 'Salvando...' : 'Salvar Registro'} icon="save-outline" onPress={(): void => { void save(); }} disabled={busy || photoBusy} />
        <ActionButton title="Cancelar" icon="close-outline" secondary onPress={(): void => navigation.goBack()} disabled={busy || photoBusy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 600, alignSelf: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  step: { backgroundColor: colors.soft, color: colors.primaryDark, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, fontWeight: '700' },
  stepText: { color: colors.muted, fontSize: 11 },
  localReady: { color: colors.success, fontSize: 11, fontWeight: '700', marginLeft: 'auto' },
  photoCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 },
  photoTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  photoActions: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  photoPermissionHint: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: -8, marginBottom: 14 },
  formFields: { marginTop: 10 },
  helper: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: -10, marginBottom: 18 },
  optional: { color: colors.muted, fontSize: 12, fontWeight: '400' },
  observationInput: { backgroundColor: colors.surface, borderColor: '#ECEEF5', borderWidth: 1, borderRadius: 12, color: colors.text, fontSize: 15, minHeight: 108, paddingHorizontal: 14, paddingTop: 12, marginBottom: 14 },
  infoCard: { backgroundColor: '#F0F2FF', borderRadius: 16, padding: 16, marginBottom: 20, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  infoTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
});
