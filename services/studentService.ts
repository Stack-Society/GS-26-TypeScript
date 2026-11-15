import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import { NewStudent, SchoolStage, ServiceResult, Student, StudentEdits } from '../models/types';
import { normalizeSchoolYear, validateStudent } from '../utils/validation';

// Uma chave única mantém a lista consistente entre cadastro, edição e detalhes.
const STUDENTS_KEY = '@citizentech/students';

// Personagens e observações inteiramente fictícios, criados para a demonstração.
const initialStudents: Student[] = [
  { id: 'EST-0101', name: 'Gabriel Souza Oliveira', className: '7º ano B', schoolYear: '7º ano', stage: SchoolStage.FundamentalII, observation: 'Apresentou progresso na interpretação de charges textuais.', statusLabel: 'Atenção em Leitura', statusTone: 'alert', bnccSkill: 'EF69LP04', resultSummary: '3 intervenções ativas', goal: 'Ganhar autonomia em inferências textuais.', progressPercent: 68 },
  { id: 'EST-0102', name: 'Beatriz Albuquerque', className: '7º ano B', schoolYear: '7º ano', stage: SchoolStage.FundamentalII, observation: 'Acompanhar compreensão de textos curtos.', statusLabel: 'Em desenvolvimento', statusTone: 'progress', bnccSkill: 'EF07LP08', resultSummary: 'Última avaliação: 8,5', goal: 'Ampliar a compreensão de textos curtos.', progressPercent: 74 },
  { id: 'EST-0103', name: 'Lucas Nogueira', className: '7º ano B', schoolYear: '7º ano', stage: SchoolStage.FundamentalII, observation: 'Revisar estratégias de leitura em sala.', statusLabel: 'Nível dominado', statusTone: 'success', bnccSkill: 'EF69LP47', resultSummary: 'Trilha concluída', goal: 'Consolidar estratégias de leitura.', progressPercent: 100 },
];
// O Set protege os três personagens de demonstração mesmo em chamadas diretas ao serviço.
const initialStudentIds = new Set(initialStudents.map((student): string => student.id));

// A mesma checagem decide a visibilidade dos botões e bloqueia a operação no serviço.
export function isInitialStudent(id: string): boolean {
  return initialStudentIds.has(id.trim().toUpperCase());
}

// O armazenamento pode conter JSON antigo ou inválido; a guarda evita dados sem formato esperado.
function isStudent(value: unknown): value is Student {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === 'string' && typeof row.name === 'string' && typeof row.className === 'string' && typeof row.schoolYear === 'string' && typeof row.stage === 'string' && typeof row.observation === 'string' && (row.photoUri === undefined || typeof row.photoUri === 'string') && (row.statusLabel === undefined || typeof row.statusLabel === 'string') && (row.statusTone === undefined || row.statusTone === 'alert' || row.statusTone === 'progress' || row.statusTone === 'success') && (row.bnccSkill === undefined || typeof row.bnccSkill === 'string') && (row.resultSummary === undefined || typeof row.resultSummary === 'string') && (row.goal === undefined || typeof row.goal === 'string') && (row.progressPercent === undefined || typeof row.progressPercent === 'number');
}

// Inicializa exemplos no primeiro uso e complementa campos demonstrativos de versões antigas.
async function readStudents(): Promise<Student[]> {
  const stored = await AsyncStorage.getItem(STUDENTS_KEY);
    if (stored === null) {
    await AsyncStorage.setItem(STUDENTS_KEY, JSON.stringify(initialStudents));
    return initialStudents;
  }
  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed) || !parsed.every(isStudent)) throw new Error('Dados locais inválidos');
  return parsed.map((item): Student => {
    const sample = initialStudents.find((seed): boolean => seed.id === item.id);
    return sample ? {
      ...sample,
      ...item,
      statusLabel: item.statusLabel ?? sample.statusLabel,
      statusTone: item.statusTone ?? sample.statusTone,
      bnccSkill: item.bnccSkill ?? sample.bnccSkill,
      resultSummary: item.resultSummary ?? sample.resultSummary,
      goal: item.goal ?? sample.goal,
      progressPercent: item.progressPercent ?? sample.progressPercent,
    } : item;
  });
}

// Fotos vindas do seletor podem ser temporárias; a cópia mantém o avatar após reiniciar.
async function copyStudentPhoto(sourceUri: string): Promise<File> {
  const directory = new Directory(Paths.document, 'student-photos');
  if (!directory.exists) directory.create({ intermediates: true });
  const extension = /\.(jpe?g|png|heic|webp)(?:\?|$)/i.exec(sourceUri)?.[1]?.toLowerCase() ?? 'jpg';
  const photo = new File(directory, `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`);
  await new File(sourceUri).copy(photo);
  return photo;
}

// O resultado tipado permite que a lista diferencie carregamento, erro e vazio.
export async function listStudents(): Promise<ServiceResult<Student[]>> {
  try {
    return { ok: true, data: await readStudents() };
  } catch {
    return { ok: false, message: 'Não foi possível carregar os estudantes. Tente novamente.' };
  }
}

// Detalhes recebem só o ID da rota e consultam os dados atuais no serviço.
export async function getStudent(id: string): Promise<ServiceResult<Student>> {
  try {
    const student = (await readStudents()).find((item): boolean => item.id === id);
    return student ? { ok: true, data: student } : { ok: false, message: 'Estudante não encontrado.' };
  } catch {
    return { ok: false, message: 'Não foi possível abrir os dados do estudante.' };
  }
}

// Valida novamente no serviço para impedir gravações inválidas fora do formulário.
export async function createStudent(input: NewStudent): Promise<ServiceResult<Student>> {
  if (Object.keys(validateStudent(input)).length > 0) {
    return { ok: false, message: 'Confira os campos do estudante antes de salvar.' };
  }
  let copiedPhoto: File | null = null;
  try {
    const students = await readStudents();
    if (students.some((item): boolean => item.id.toUpperCase() === input.id.trim().toUpperCase())) {
      return { ok: false, message: 'Este código de identificação já está em uso.' };
    }
    const year = normalizeSchoolYear(input.schoolYear);
    const stage = /^[1-5]º? ano$/i.test(year) ? SchoolStage.FundamentalI : /^[6-9]º? ano$/i.test(year) ? SchoolStage.FundamentalII : SchoolStage.Medio;
    if (input.photoUri) copiedPhoto = await copyStudentPhoto(input.photoUri);
    const student: Student = { id: input.id.trim().toUpperCase(), name: input.name.trim(), className: input.className.trim(), schoolYear: year, stage, observation: input.observation?.trim() || 'Acompanhamento inicial ainda não registrado.', photoUri: copiedPhoto?.uri };
    await AsyncStorage.setItem(STUDENTS_KEY, JSON.stringify([...students, student]));
    return { ok: true, data: student };
  } catch {
    try {
      if (copiedPhoto?.exists) copiedPhoto.delete();
    } catch {
      // Mantém o erro de cadastro mesmo se a limpeza da foto falhar.
    }
    return { ok: false, message: 'Não foi possível salvar o estudante. Tente novamente.' };
  }
}

// Edição mantém o ID e a foto, recalcula a etapa e bloqueia os exemplos iniciais.
export async function updateStudent(id: string, edits: StudentEdits): Promise<ServiceResult<Student>> {
  const normalizedId = id.trim().toUpperCase();
  if (isInitialStudent(normalizedId)) {
    return { ok: false, message: 'Os estudantes iniciais da demonstração não podem ser editados.' };
  }
  if (Object.keys(validateStudent({ ...edits, id: normalizedId })).length > 0) {
    return { ok: false, message: 'Confira os campos do estudante antes de salvar.' };
  }
  try {
    const students = await readStudents();
    const index = students.findIndex((item): boolean => item.id === normalizedId);
    if (index < 0) return { ok: false, message: 'Estudante não encontrado.' };
    const year = normalizeSchoolYear(edits.schoolYear);
    const stage = /^[1-5]º? ano$/i.test(year) ? SchoolStage.FundamentalI : /^[6-9]º? ano$/i.test(year) ? SchoolStage.FundamentalII : SchoolStage.Medio;
    const updated: Student = {
      ...students[index],
      name: edits.name.trim(),
      className: edits.className.trim(),
      schoolYear: year,
      stage,
      observation: edits.observation.trim() || 'Acompanhamento inicial ainda não registrado.',
    };
    students[index] = updated;
    await AsyncStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
    return { ok: true, data: updated };
  } catch {
    return { ok: false, message: 'Não foi possível salvar as alterações. Tente novamente.' };
  }
}

// Troca ou remove a foto sem alterar os demais dados pedagógicos do estudante.
export async function updateStudentPhoto(id: string, sourceUri: string | null): Promise<ServiceResult<Student>> {
  let copiedPhoto: File | null = null;
  try {
    const students = await readStudents();
    const index = students.findIndex((item): boolean => item.id === id);
    if (index < 0) return { ok: false, message: 'Estudante não encontrado.' };
    const previous = students[index];
    if (sourceUri) {
      copiedPhoto = await copyStudentPhoto(sourceUri);
    }
    const updated: Student = { ...previous, photoUri: copiedPhoto?.uri };
    students[index] = updated;
    await AsyncStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
    if (previous.photoUri && previous.photoUri !== updated.photoUri) {
      try {
        const oldPhoto = new File(previous.photoUri);
        if (oldPhoto.exists) oldPhoto.delete();
      } catch {
        // O registro já foi salvo; uma foto antiga ausente não invalida a atualização.
      }
    }
    return { ok: true, data: updated };
  } catch {
    try {
      if (copiedPhoto?.exists) copiedPhoto.delete();
    } catch {
      // Mantém a mensagem de erro original se a limpeza do arquivo falhar.
    }
    return { ok: false, message: 'Não foi possível salvar a imagem. Tente novamente.' };
  }
}

// A exclusão protege os exemplos e só limpa foto/lembretes após remover o cadastro.
export async function deleteStudent(id: string): Promise<ServiceResult<null>> {
  const normalizedId = id.trim().toUpperCase();
  if (isInitialStudent(normalizedId)) {
    return { ok: false, message: 'Os estudantes iniciais da demonstração não podem ser excluídos.' };
  }
  try {
    const students = await readStudents();
    const student = students.find((item): boolean => item.id === normalizedId);
    if (!student) return { ok: false, message: 'Estudante não encontrado.' };

    await AsyncStorage.setItem(STUDENTS_KEY, JSON.stringify(students.filter((item): boolean => item.id !== normalizedId)));

    // A exclusão do cadastro não depende da disponibilidade dos módulos nativos.
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const reminders = scheduled.filter((request): boolean => request.content.data?.studentId === normalizedId);
      await Promise.allSettled(reminders.map((request): Promise<void> => Notifications.cancelScheduledNotificationAsync(request.identifier)));
    } catch {
      // O cadastro já foi removido; uma falha nas notificações não restaura o registro.
    }
    if (student.photoUri) {
      try {
        const photo = new File(student.photoUri);
        if (photo.exists) photo.delete();
      } catch {
        // Uma foto ausente não invalida a exclusão do cadastro.
      }
    }
    return { ok: true, data: null };
  } catch {
    return { ok: false, message: 'Não foi possível excluir o estudante. Tente novamente.' };
  }
}
