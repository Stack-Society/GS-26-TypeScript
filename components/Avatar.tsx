import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../styles';

// O mesmo avatar serve à lista, aos detalhes e ao perfil do professor.
interface Props { name: string; large?: boolean; photoUri?: string }

export function Avatar({ name, large = false, photoUri }: Props): React.JSX.Element {
  // Guarda apenas o URI que falhou, permitindo testar uma foto nova depois.
  const [failedUri, setFailedUri] = useState<string | null>(null);
  // As iniciais mantêm o perfil identificável sem obrigar o uso de imagem.
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part): string => part[0]?.toLocaleUpperCase('pt-BR') ?? '').join('');
  if (photoUri && photoUri !== failedUri) {
    return <Image source={{ uri: photoUri }} style={[styles.circle, large ? styles.large : null]} accessibilityLabel={`Foto de ${name}`} onError={(): void => setFailedUri(photoUri)} />;
  }
  return <View style={[styles.circle, large ? styles.large : null]} accessibilityLabel={`Iniciais de ${name}`}><Text style={[styles.text, large ? styles.largeText : null]}>{initials}</Text></View>;
}

const styles = StyleSheet.create({
  circle: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  large: { width: 72, height: 72, borderRadius: 36 },
  text: { color: colors.primaryDark, fontSize: 18, fontWeight: '700' },
  largeText: { fontSize: 23 },
});
