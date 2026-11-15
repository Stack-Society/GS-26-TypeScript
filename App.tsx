import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Teacher } from './models/types';
import { LoginScreen } from './screens/LoginScreen';
import { StudentsScreen } from './screens/StudentsScreen';
import { NewStudentScreen } from './screens/NewStudentScreen';
import { StudentDetailsScreen } from './screens/StudentDetailsScreen';
import { EditStudentScreen } from './screens/EditStudentScreen';
import { getSession, signOut } from './services/teacherService';
import { colors, shared } from './styles';

// As rotas tipadas impedem navegar para uma tela inexistente ou passar parâmetros errados.
export type RootStackParamList = {
  Login: undefined;
  Students: undefined;
  NewStudent: undefined;
  StudentDetails: { studentId: string };
  EditStudent: { studentId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// O cabeçalho identifica o professor ativo e limita sua largura em telas estreitas.
function HeaderTitle({ title, teacherName }: { title: string; teacherName: string }): React.JSX.Element {
  const { width } = useWindowDimensions();
  return <View style={{ maxWidth: Math.min(230, Math.max(120, width - 170)) }}><Text numberOfLines={1} style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>{title}</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success }} /><Text numberOfLines={1} style={{ color: colors.muted, fontSize: 11 }}>Prof. {teacherName}</Text></View></View>;
}

export default function App(): React.JSX.Element {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);

  // Recupera a sessão antes de montar a pilha para evitar exibir o login por um instante.
  useEffect((): void => {
    void getSession().then(setTeacher).finally((): void => setLoading(false));
  }, []);

  const logout = async (): Promise<void> => {
    try {
      await signOut();
      setTeacher(null);
    } catch {
      Alert.alert('Não foi possível sair', 'Tente novamente. A sessão local ainda está ativa.');
    }
  };

  // A saída também fica acessível no cabeçalho da lista.
  const headerRight = (): React.JSX.Element => <Pressable accessibilityRole="button" accessibilityLabel="Sair da conta" onPress={(): void => { void logout(); }} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="log-out-outline" size={21} color={colors.primaryDark} /></Pressable>;

  if (loading) {
    return <View style={[shared.page, { justifyContent: 'center' }]}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  // Trocar o grupo de rotas ao entrar ou sair impede voltar a uma tela da sessão anterior.
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, headerShadowVisible: false, contentStyle: { backgroundColor: colors.background } }}>
        {teacher ? (
          <>
            <Stack.Screen name="Students" options={{ headerTitle: () => <HeaderTitle title="Lista de Estudantes" teacherName={teacher.name} />, headerBackVisible: false, headerRight }}>
              {(props) => <StudentsScreen {...props} teacher={teacher} onTeacherChange={setTeacher} onLogout={logout} />}
            </Stack.Screen>
            <Stack.Screen name="NewStudent" component={NewStudentScreen} options={{ headerTitle: () => <HeaderTitle title="Cadastro de Estudante" teacherName={teacher.name} />, headerRight }} />
            <Stack.Screen name="StudentDetails" component={StudentDetailsScreen} options={{ headerTitle: () => <HeaderTitle title="Detalhes do Estudante" teacherName={teacher.name} />, headerRight }} />
            <Stack.Screen name="EditStudent" component={EditStudentScreen} options={{ headerTitle: () => <HeaderTitle title="Editar Estudante" teacherName={teacher.name} />, headerRight }} />
          </>
        ) : (
          <Stack.Screen name="Login" options={{ headerShown: false }}>
            {(props) => <LoginScreen {...props} onLogin={setTeacher} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
