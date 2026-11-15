import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TextInputInstance, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { ActionButton } from '../components/ActionButton';
import { FormField } from '../components/FormField';
import { StudentEdits } from '../models/types';
import { getStudent, isInitialStudent, updateStudent } from '../services/studentService';
import { colors, shared } from '../styles';
import { FieldErrors, validateStudent } from '../utils/validation';
import { useKeyboardForm } from '../utils/useKeyboardForm';

// A rota de edição exige o ID, mas carrega os dados atuais do armazenamento local.
type Props = NativeStackScreenProps<RootStackParamList, 'EditStudent'>;

export function EditStudentScreen({ navigation, route }: Props): React.JSX.Element {
  // O ID fica fora dos campos editáveis para manter referências e lembretes íntegros.
  const studentId = route.params.studentId;
  const insets = useSafeAreaInsets();
  const { scrollRef, keyboardHeight, onScroll, onFieldFocus, onContentSizeChange } = useKeyboardForm();
  const nameRef = useRef<TextInputInstance>(null);
  const classRef = useRef<TextInputInstance>(null);
  const yearRef = useRef<TextInputInstance>(null);
  const observationRef = useRef<TextInputInstance>(null);
  const [fields, setFields] = useState<StudentEdits>({ name: '', className: '', schoolYear: '', observation: '' });
  const [errors, setErrors] = useState<FieldErrors<StudentEdits>>({});
  const [loading, setLoading] = useState(!isInitialStudent(studentId));
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  // A checagem do exemplo e a leitura assíncrona evitam abrir um formulário indevido.
  useEffect((): (() => void) => {
    let active = true;
    if (isInitialStudent(studentId)) return (): void => { active = false; };
    void getStudent(studentId).then((result): void => {
      if (!active) return;
      if (result.ok) {
        setFields({ name: result.data.name, className: result.data.className, schoolYear: result.data.schoolYear, observation: result.data.observation });
        setReady(true);
      } else setMessage(result.message);
    }).finally((): void => { if (active) setLoading(false); });
    return (): void => { active = false; };
  }, [studentId]);

  // Atualiza somente o campo digitado, preservando os demais dados carregados.
  const change = (field: keyof StudentEdits, value: string): void => {
    setFields((current): StudentEdits => ({ ...current, [field]: value }));
  };

  // A validação usa as mesmas regras do cadastro; o serviço valida novamente ao salvar.
  const save = async (): Promise<void> => {
    const validation = validateStudent({ ...fields, id: studentId });
    setErrors(validation);
    setMessage('');
    if (Object.keys(validation).length > 0) {
      const firstInvalid = validation.name ? nameRef : validation.className ? classRef : yearRef;
      firstInvalid.current?.focus();
      return;
    }
    setBusy(true);
    const result = await updateStudent(studentId, fields);
    setBusy(false);
    Keyboard.dismiss();
    if (result.ok) navigation.goBack();
    else setMessage(result.message);
  };

  if (loading) return <View style={[shared.page, styles.loading]}><ActivityIndicator color={colors.primary} /></View>;
  // Não mostra campos vazios se a leitura falhar ou se o ID for de demonstração.
  if (!ready) {
    return <View style={[shared.page, shared.content]}><Text style={shared.heading}>Edição indisponível</Text><Text style={shared.body}>{isInitialStudent(studentId) ? 'Os estudantes iniciais da demonstração não podem ser editados.' : message}</Text></View>;
  }

  return (
    <KeyboardAvoidingView style={shared.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* A rolagem acompanha o campo ativo para o teclado não encobrir a edição. */}
      <ScrollView ref={scrollRef} onScroll={onScroll} scrollEventThrottle={16} onContentSizeChange={onContentSizeChange} contentContainerStyle={[shared.content, styles.content, { paddingBottom: 36 + insets.bottom + (Platform.OS === 'android' ? keyboardHeight : 0) }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" scrollsChildToFocus>
        <Text style={shared.heading}>Editar estudante</Text>
        <Text style={shared.body}>Atualize os dados fictícios deste cadastro. O código {studentId} permanece fixo.</Text>
        <View style={[shared.card, styles.formCard]}>
          <FormField ref={nameRef} icon="person-outline" label="Nome Completo do Estudante *" value={fields.name} onChangeText={(value): void => change('name', value)} onFocus={(): void => onFieldFocus(nameRef)} onSubmitEditing={(): void => classRef.current?.focus()} returnKeyType="next" error={errors.name} />
          <FormField ref={classRef} icon="people-outline" label="Turma *" value={fields.className} onChangeText={(value): void => change('className', value)} onFocus={(): void => onFieldFocus(classRef)} onSubmitEditing={(): void => yearRef.current?.focus()} returnKeyType="next" error={errors.className} />
          <FormField ref={yearRef} icon="school-outline" label="Ano Escolar *" value={fields.schoolYear} onChangeText={(value): void => change('schoolYear', value)} onFocus={(): void => onFieldFocus(yearRef)} onSubmitEditing={(): void => observationRef.current?.focus()} returnKeyType="next" placeholder="Ex.: 7 ou 7º ano" error={errors.schoolYear} />
          <Text style={shared.label}>Observação de Acompanhamento</Text>
          <TextInput ref={observationRef} accessibilityLabel="Observação de Acompanhamento" value={fields.observation} onChangeText={(value): void => change('observation', value)} onFocus={(): void => onFieldFocus(observationRef)} multiline textAlignVertical="top" placeholder="Descreva o acompanhamento do estudante" placeholderTextColor="#98A0B2" style={styles.observationInput} />
          {message ? <Text style={shared.error}>{message}</Text> : null}
        </View>
        <ActionButton title={busy ? 'Salvando...' : 'Salvar alterações'} icon="save-outline" onPress={(): void => { void save(); }} disabled={busy} />
        <ActionButton title="Cancelar" secondary onPress={(): void => navigation.goBack()} disabled={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loading: { justifyContent: 'center' },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center' },
  formCard: { marginTop: 18 },
  observationInput: { backgroundColor: colors.surface, borderColor: '#ECEEF5', borderWidth: 1, borderRadius: 12, color: colors.text, fontSize: 15, minHeight: 108, paddingHorizontal: 14, paddingTop: 12, marginBottom: 14 },
});
