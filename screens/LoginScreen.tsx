import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInputInstance, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { ActionButton } from '../components/ActionButton';
import { FormField } from '../components/FormField';
import { Teacher } from '../models/types';
import { hasRegisteredTeacher, registerTeacher, signIn } from '../services/teacherService';
import { colors, shared } from '../styles';
import { validateTeacher } from '../utils/validation';
import { useKeyboardForm } from '../utils/useKeyboardForm';

// A tela comunica ao App o professor autenticado para liberar a navegação interna.
type Props = NativeStackScreenProps<RootStackParamList, 'Login'> & { onLogin: (teacher: Teacher) => void };

export function LoginScreen({ onLogin }: Props): React.JSX.Element {
  // Modo, erros e operação assíncrona ficam separados para não misturar cadastro e entrada.
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<{ name?: string; code?: string }>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [switching, setSwitching] = useState(false);
  const switchingRef = useRef(false);
  const [formTransition] = useState((): Animated.Value => new Animated.Value(1));
  const nameRef = useRef<TextInputInstance>(null);
  const codeRef = useRef<TextInputInstance>(null);
  const { scrollRef, keyboardHeight, onScroll, onFieldFocus, onContentSizeChange } = useKeyboardForm();
  const keyboardOpen = keyboardHeight > 0;

  // Verifica os cadastros locais antes de habilitar o envio do formulário.
  useEffect((): void => {
    void hasRegisteredTeacher().then((exists): void => {
      setRegistered(exists);
      setMode(exists ? 'login' : 'register');
    }).catch((): void => setMessage('Não foi possível ler o cadastro local. Tente novamente.'));
  }, []);

  // O botão de recuperação repete a leitura se o armazenamento falhar.
  const loadRegistration = async (): Promise<void> => {
    try {
      const exists = await hasRegisteredTeacher();
      setMessage('');
      setRegistered(exists);
      setMode(exists ? 'login' : 'register');
    } catch {
      setMessage('Não foi possível ler o cadastro local. Tente novamente.');
    }
  };

  // Valida primeiro; só chama o serviço quando nome e código foram preenchidos.
  const submit = async (): Promise<void> => {
    const teacher = { name: name.trim(), code: code.trim() };
    const nextErrors = validateTeacher(teacher);
    setErrors(nextErrors);
    setMessage('');
    if (Object.keys(nextErrors).length > 0) {
      (nextErrors.name ? nameRef : codeRef).current?.focus();
      return;
    }
    if (registered === null) return;
    setBusy(true);
    const result = mode === 'login' ? await signIn(teacher) : await registerTeacher(teacher);
    setBusy(false);
    Keyboard.dismiss();
    if (result.ok) onLogin(result.data);
    else setMessage(result.message);
  };

  // A transição curta indica a troca de contexto sem desmontar os campos.
  const switchMode = (): void => {
    if (switchingRef.current) return;
    switchingRef.current = true;
    Keyboard.dismiss();
    setSwitching(true);
    Animated.timing(formTransition, { toValue: 0, duration: 110, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(({ finished }): void => {
      if (!finished) {
        switchingRef.current = false;
        setSwitching(false);
        return;
      }
      setMode((current): 'login' | 'register' => current === 'login' ? 'register' : 'login');
      setErrors({});
      setMessage('');
      setCode('');
      requestAnimationFrame((): void => {
        Animated.timing(formTransition, { toValue: 1, duration: 190, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start((): void => {
          switchingRef.current = false;
          setSwitching(false);
        });
      });
    });
  };

  return (
    <SafeAreaView style={shared.page} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={shared.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* A rolagem com espaço extra mantém os campos acessíveis acima do teclado virtual. */}
        <ScrollView ref={scrollRef} onScroll={onScroll} scrollEventThrottle={16} onContentSizeChange={onContentSizeChange} contentContainerStyle={[shared.content, styles.scrollContent, { paddingBottom: Platform.OS === 'android' && keyboardOpen ? keyboardHeight + 32 : 36 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" scrollsChildToFocus>
          <View style={styles.brand}>
            <View style={styles.logo}><Ionicons name="book-outline" size={36} color="#FFFFFF" /></View>
            <Text style={styles.eyebrow}>Ambiente Docente</Text>
            <Text style={styles.brandTitle}>AprendIA</Text>
            <Text style={styles.brandSubtitle}>Acompanhamento pedagógico e diagnóstico formativo contínuo.</Text>
            <View style={styles.pill}><View style={styles.dot} /><Text style={styles.pillText}>Sessão local persistida: AsyncStorage</Text><Ionicons name="lock-closed-outline" size={15} color={colors.text} /></View>
          </View>
          <Animated.View style={[shared.card, { opacity: formTransition, transform: [{ translateY: formTransition.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
            <Text style={shared.heading}>{mode === 'login' ? 'Identificação do Docente' : 'Novo cadastro docente'}</Text>
            <Text style={[shared.body, { marginBottom: 24 }]}>{mode === 'login' ? 'Acesse sua turma sem coletar dados sensíveis pessoais.' : 'Crie uma identificação fictícia para acessar sua turma.'}</Text>
            <FormField ref={nameRef} icon="person-outline" label="Nome ou Apelido do Docente *" value={name} onChangeText={setName} onFocus={(): void => onFieldFocus(nameRef)} onSubmitEditing={(): void => codeRef.current?.focus()} returnKeyType="next" autoCapitalize="words" placeholder="Ex.: Profa. Luana Silva" error={errors.name} />
            <FormField ref={codeRef} icon="id-card-outline" label="Código de Identificação Fictício *" value={code} onChangeText={setCode} onFocus={(): void => onFieldFocus(codeRef)} onSubmitEditing={(): void => { void submit(); }} returnKeyType="go" autoCapitalize="characters" autoCorrect={false} placeholder="Ex.: DOC-8492" error={errors.code} />
            {message ? <Text style={shared.error}>{message}</Text> : null}
            {registered === null && message ? <ActionButton title="Tentar novamente" secondary onPress={(): void => { void loadRegistration(); }} /> : null}
            <ActionButton icon="log-in-outline" title={busy ? 'Aguarde...' : mode === 'login' ? 'Entrar no Sistema' : 'Cadastrar e Entrar'} onPress={(): void => { void submit(); }} disabled={busy || switching || registered === null} />
            {registered ? <ActionButton title={mode === 'login' ? 'Cadastrar outro professor' : 'Já tenho cadastro'} secondary onPress={switchMode} disabled={busy || switching} /> : null}
          </Animated.View>
          {!keyboardOpen ? <View style={styles.privacyCard}>
            <View style={styles.privacyHeading}><View style={styles.privacyIcon}><Ionicons name="phone-portrait-outline" size={23} color={colors.primaryDark} /></View><View style={{ flex: 1 }}><Text style={styles.privacyTitle}>Armazenamento Local</Text><Text style={shared.body}>Os cadastros fictícios ficam apenas neste aparelho. O AsyncStorage não é criptografado.</Text></View></View>
            <View style={styles.statusRow}><View style={styles.statusCircle}><Text style={styles.statusInitial}>--</Text></View><View style={{ flex: 1 }}><Text style={styles.statusTitle}>Nenhum professor ativo</Text><Text style={shared.body}>Status: Desconectado</Text></View><Text style={styles.statusBadge}>Vazio</Text></View>
          </View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, width: '100%', maxWidth: 500, alignSelf: 'center' },
  brand: { alignItems: 'center', marginTop: 12, marginBottom: 26 },
  logo: { width: 72, height: 72, borderRadius: 19, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', marginBottom: 16, elevation: 3 },
  eyebrow: { backgroundColor: colors.soft, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 4, color: colors.primaryDark, fontSize: 12, fontWeight: '700', marginBottom: 10 },
  brandTitle: { color: colors.text, fontSize: 27, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  brandSubtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 340 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F1F2FC', borderRadius: 99, paddingHorizontal: 13, paddingVertical: 9, marginTop: 24, maxWidth: '100%' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  pillText: { color: colors.text, fontSize: 12, fontWeight: '600', flexShrink: 1 },
  privacyCard: { backgroundColor: '#F0F2FF', borderRadius: 18, padding: 18, marginTop: 10 },
  privacyHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  privacyIcon: { backgroundColor: colors.surface, padding: 10, borderRadius: 12 },
  privacyTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginTop: 16 },
  statusCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  statusInitial: { color: colors.primaryDark, fontWeight: '700' },
  statusTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  statusBadge: { color: colors.muted, backgroundColor: colors.soft, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, fontSize: 11 },
});
