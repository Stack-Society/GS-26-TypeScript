import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActionButton } from './components/ActionButton';
import { Teacher } from './models/types';
import { LoginScreen } from './screens/LoginScreen';
import { getSession, signOut } from './services/teacherService';
import { colors, shared } from './styles';

// As rotas tipadas impedem navegar para uma tela inexistente ou passar parâmetros errados.
export type RootStackParamList = {
  Login: undefined;
  TeacherHome: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function TeacherHome({ teacher, onLogout }: { teacher: Teacher; onLogout: () => Promise<void> }): React.JSX.Element {
  return (
    <View style={[shared.page, shared.content]}>
      <Text style={shared.title}>Olá, {teacher.name}</Text>
      <Text style={shared.body}>Bem-vindo ao AprendIA.</Text>
      <ActionButton title="Sair da conta" icon="log-out-outline" secondary onPress={(): void => { void onLogout(); }} />
    </View>
  );
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

  if (loading) {
    return <View style={[shared.page, { justifyContent: 'center' }]}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  // Trocar o grupo de rotas ao entrar ou sair impede voltar a uma tela da sessão anterior.
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, contentStyle: { backgroundColor: colors.background } }}>
        {teacher ? (
          <Stack.Screen name="TeacherHome" options={{ title: 'Área docente', headerBackVisible: false }}>
            {() => <TeacherHome teacher={teacher} onLogout={logout} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Login" options={{ headerShown: false }}>
            {(props) => <LoginScreen {...props} onLogin={setTeacher} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
