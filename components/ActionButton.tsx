import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles';

// Props concentra o padrão visual e a acessibilidade dos botões das telas.
interface Props {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function ActionButton({ title, onPress, secondary = false, disabled = false, icon }: Props): React.JSX.Element {
  // Pressable bloqueia o toque durante operações assíncronas e anuncia o estado desabilitado.
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.button, secondary ? styles.secondary : styles.primary, disabled ? { opacity: 0.6 } : null]}>
      {icon ? <Ionicons name={icon} size={18} color={secondary ? colors.primaryDark : '#FFFFFF'} style={styles.icon} /> : null}
      <Text style={[styles.text, secondary ? styles.secondaryText : styles.primaryText]}>{title}</Text>
    </Pressable>
  );
}

// As variantes primária e secundária preservam a hierarquia visual do aplicativo.
const styles = StyleSheet.create({
  button: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingHorizontal: 16, marginTop: 8 },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.soft },
  text: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  icon: { marginRight: 8 },
  primaryText: { color: '#FFFFFF' },
  secondaryText: { color: colors.primaryDark },
});
