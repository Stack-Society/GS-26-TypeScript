import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { ServiceResult, Teacher } from '../models/types';

// Chaves distintas separam a lista de professores da sessão atualmente aberta.
const REGISTERED_KEY = '@citizentech/teachers';
const LEGACY_REGISTERED_KEY = '@citizentech/teacher';
const SESSION_KEY = '@citizentech/session';

// Valida JSON lido do aparelho antes de tratá-lo como um Teacher tipado.
function isTeacher(value: unknown): value is Teacher {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.name === 'string' && typeof record.code === 'string' && (record.photoUri === undefined || typeof record.photoUri === 'string');
}

// A leitura também migra o cadastro único usado pelas primeiras versões do app.
async function getRegisteredTeachers(): Promise<Teacher[]> {
  const stored = await AsyncStorage.getItem(REGISTERED_KEY);
  if (stored !== null) {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.every(isTeacher)) throw new Error('Cadastro local inválido');
    return parsed;
  }

  // Preserva o cadastro criado antes de o aplicativo aceitar mais de um professor.
  const legacy = await AsyncStorage.getItem(LEGACY_REGISTERED_KEY);
  if (legacy === null) return [];
  const parsed: unknown = JSON.parse(legacy);
  if (!isTeacher(parsed)) throw new Error('Cadastro local inválido');
  const teachers = [parsed];
  await AsyncStorage.setItem(REGISTERED_KEY, JSON.stringify(teachers));
  return teachers;
}

// Define se a identificação deve começar no modo de entrada ou cadastro.
export async function hasRegisteredTeacher(): Promise<boolean> {
  return (await getRegisteredTeachers()).length > 0;
}

// Confere a sessão contra um cadastro existente para não aceitar um registro obsoleto.
export async function getSession(): Promise<Teacher | null> {
  try {
    const stored = await AsyncStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    if (!isTeacher(parsed)) return null;
    const registered = await getRegisteredTeachers();
    return registered.find((saved): boolean => saved.name === parsed.name && saved.code === parsed.code) ?? null;
  } catch {
    return null;
  }
}

// Permite vários professores no aparelho, mas exige código fictício único.
export async function registerTeacher(teacher: Teacher): Promise<ServiceResult<Teacher>> {
  try {
    const teachers = await getRegisteredTeachers();
    if (teachers.some((saved): boolean => saved.code.toLocaleLowerCase('pt-BR') === teacher.code.toLocaleLowerCase('pt-BR'))) {
      return { ok: false, message: 'Este código fictício já foi cadastrado. Entre com ele ou escolha outro.' };
    }
    await AsyncStorage.setItem(REGISTERED_KEY, JSON.stringify([...teachers, teacher]));
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(teacher));
    return { ok: true, data: teacher };
  } catch {
    return { ok: false, message: 'Não foi possível salvar a identificação neste aparelho.' };
  }
}

// Compara sem diferenciar maiúsculas para combinar com a verificação de duplicidade.
export async function signIn(teacher: Teacher): Promise<ServiceResult<Teacher>> {
  try {
    const teachers = await getRegisteredTeachers();
    const registered = teachers.find((saved): boolean => saved.name.trim().toLocaleLowerCase('pt-BR') === teacher.name.trim().toLocaleLowerCase('pt-BR') && saved.code.trim().toLocaleLowerCase('pt-BR') === teacher.code.trim().toLocaleLowerCase('pt-BR'));
    if (!registered) {
      return { ok: false, message: 'Nome e código não correspondem ao cadastro deste aparelho.' };
    }
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(registered));
    return { ok: true, data: registered };
  } catch {
    return { ok: false, message: 'Não foi possível recuperar a identificação.' };
  }
}

// Sair remove somente a sessão; os cadastros permanecem para entradas futuras.
export async function signOut(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

// Copia a imagem para um arquivo persistente antes de trocar o URI no cadastro.
export async function updateTeacherPhoto(code: string, sourceUri: string | null): Promise<ServiceResult<Teacher>> {
  let copiedPhoto: File | null = null;
  try {
    const teachers = await getRegisteredTeachers();
    const index = teachers.findIndex((saved): boolean => saved.code === code);
    if (index < 0) return { ok: false, message: 'Cadastro do professor não encontrado.' };
    const previous = teachers[index];
    if (sourceUri) {
      const directory = new Directory(Paths.document, 'teacher-photos');
      if (!directory.exists) directory.create({ intermediates: true });
      const extension = /\.(jpe?g|png|heic|webp)(?:\?|$)/i.exec(sourceUri)?.[1]?.toLowerCase() ?? 'jpg';
      copiedPhoto = new File(directory, `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`);
      await new File(sourceUri).copy(copiedPhoto);
    }
    const updated: Teacher = { ...previous, photoUri: copiedPhoto?.uri };
    teachers[index] = updated;
    await AsyncStorage.setItem(REGISTERED_KEY, JSON.stringify(teachers));
    // O arquivo antigo só é apagado depois que o novo estado foi salvo.
    if (previous.photoUri && previous.photoUri !== updated.photoUri) {
      try {
        const oldPhoto = new File(previous.photoUri);
        if (oldPhoto.exists) oldPhoto.delete();
      } catch {
        // O cadastro já foi salvo; uma foto antiga ausente não invalida a atualização.
      }
    }
    return { ok: true, data: updated };
  } catch {
    try {
      if (copiedPhoto?.exists) copiedPhoto.delete();
    } catch {
      // Mantém a mensagem de erro original se a limpeza do arquivo falhar.
    }
    return { ok: false, message: 'Não foi possível salvar a foto do professor. Tente novamente.' };
  }
}
