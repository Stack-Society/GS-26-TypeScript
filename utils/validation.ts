import { NewStudent, Teacher } from '../models/types';

// Os erros usam as mesmas chaves dos formulários para aparecer junto ao campo correto.
export type FieldErrors<T> = Partial<Record<keyof T, string>>;

// Aceita a entrada curta "7" e persiste o valor legível "7º ano".
export function normalizeSchoolYear(value: string): string {
  const year = value.trim();
  return /^[1-9]$/.test(year) ? `${year}º ano` : year;
}

// Validação pura: a tela pode mostrar erros antes de gravar no AsyncStorage.
export function validateTeacher(value: Teacher): FieldErrors<Teacher> {
  const errors: FieldErrors<Teacher> = {};
  if (value.name.trim().length < 2) errors.name = 'Informe um nome ou apelido com pelo menos 2 caracteres.';
  if (value.code.trim().length < 4) errors.code = 'Informe um código fictício com pelo menos 4 caracteres.';
  return errors;
}

// A mesma regra é usada no cadastro, na edição e no serviço para evitar dados divergentes.
export function validateStudent(value: NewStudent): FieldErrors<NewStudent> {
  const errors: FieldErrors<NewStudent> = {};
  if (value.name.trim().length < 2) errors.name = 'Informe um nome fictício com pelo menos 2 caracteres.';
  if (!/^[A-Za-z0-9-]{4,20}$/.test(value.id.trim())) errors.id = 'Use de 4 a 20 letras, números ou hífens.';
  if (value.className.trim().length < 2) errors.className = 'Informe a turma.';
  if (!/^(?:[1-9]º? ano|[1-3]ª? série)$/i.test(normalizeSchoolYear(value.schoolYear))) errors.schoolYear = 'Informe de 1 a 9 (ex.: 7) ou de 1ª a 3ª série.';
  return errors;
}
