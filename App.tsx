import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Teacher } from './models/types';
import { LoginScreen } from './screens/LoginScreen';
import { StudentsScreen } from './screens/StudentsScreen';
import { NewStudentScreen } from './screens/NewStudentScreen';
import { StudentDetailsScreen } from './screens/StudentDetailsScreen';
import { getSession, signOut } from './services/teacherService';
import { colors, shared } from './styles';

// As rotas tipadas impedem navegar para uma tela inexistente ou passar parâmetros errados.
export type RootStackParamList = {
  Login: undefined;
  Students: undefined;
  NewStudent: undefined;
  StudentDetails: { studentId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

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
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, contentStyle: { backgroundColor: colors.background } }}>
        {teacher ? (
          <>
            <Stack.Screen name="Students" options={{ title: 'Lista de Estudantes', headerBackVisible: false, headerRight }}>
              {(props) => <StudentsScreen {...props} teacher={teacher} onTeacherChange={setTeacher} onLogout={logout} />}
            </Stack.Screen>
            <Stack.Screen name="NewStudent" component={NewStudentScreen} options={{ title: 'Cadastro de Estudante', headerRight }} />
            <Stack.Screen name="StudentDetails" component={StudentDetailsScreen} options={{ title: 'Detalhes do Estudante', headerRight }} />
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
