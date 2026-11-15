import { forwardRef } from 'react';
import { Text, TextInput, TextInputProps, View, type TextInputInstance } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shared } from '../styles';

// Herda TextInputProps para que cada formulário configure teclado e foco sem duplicar o campo.
interface Props extends TextInputProps {
  label: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

// A ref encaminhada permite focar o primeiro campo inválido e revelá-lo acima do teclado.
export const FormField = forwardRef<TextInputInstance, Props>(function FormField({ label, error, icon, ...inputProps }, ref): React.JSX.Element {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={shared.label}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderColor: error ? colors.error : '#ECEEF5', borderWidth: 1, borderRadius: 12, paddingLeft: icon ? 14 : 0 }}>
        {icon ? <Ionicons name={icon} size={20} color={colors.muted} /> : null}
        <TextInput {...inputProps} ref={ref} accessibilityLabel={label} style={[shared.input, { flex: 1, borderWidth: 0, backgroundColor: 'transparent', minWidth: 0 }]} placeholderTextColor="#98A0B2" selectionColor={colors.primary} disableFullscreenUI />
      </View>
      {error ? <Text style={shared.error}>{error}</Text> : null}
    </View>
  );
});
