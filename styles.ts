import { StyleSheet } from 'react-native';

// Paleta única para manter as telas consistentes com os protótipos Stitch.
export const colors = {
  primary: '#2563EB',
  primaryDark: '#004AC6',
  background: '#FAF8FF',
  surface: '#FFFFFF',
  soft: '#EAEDFF',
  text: '#131B2E',
  muted: '#434655',
  border: '#D7DCEB',
  error: '#BA1A1A',
  success: '#006C49',
  mint: '#6CF8BB',
  amber: '#996100',
  amberSoft: '#FFE6C6',
  blueSoft: '#DBE1FF',
};

// Estilos reutilizados evitam diferenças de espaçamento e contraste entre telas.
export const shared = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#F1F0F7' },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', lineHeight: 34, marginBottom: 8 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 18 },
  heading: { color: colors.text, fontSize: 18, fontWeight: '700', lineHeight: 24, marginBottom: 6 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  error: { color: colors.error, fontSize: 14, marginTop: 6 },
  label: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: { backgroundColor: colors.surface, borderColor: '#ECEEF5', borderWidth: 1, borderRadius: 12, color: colors.text, fontSize: 16, minHeight: 52, paddingHorizontal: 14 },
});
