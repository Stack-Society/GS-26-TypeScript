// O enum limita a etapa escolar a valores que a interface sabe apresentar.
export enum SchoolStage {
  FundamentalI = 'Ensino Fundamental I',
  FundamentalII = 'Ensino Fundamental II',
  Medio = 'Ensino Médio',
}

// A interface descreve o cadastro local do professor e sua foto opcional.
export interface Teacher {
  name: string;
  code: string;
  photoUri?: string;
}

// Um único contrato tipa o armazenamento, a lista e a tela de detalhes.
export interface Student {
  id: string;
  name: string;
  className: string;
  schoolYear: string;
  stage: SchoolStage;
  observation: string;
  photoUri?: string;
  statusLabel?: string;
  statusTone?: 'alert' | 'progress' | 'success';
  bnccSkill?: string;
  resultSummary?: string;
  goal?: string;
  progressPercent?: number;
}

// Pick reutiliza os campos do modelo sem exigir dados demonstrativos no cadastro.
export type NewStudent = Pick<Student, 'id' | 'name' | 'className' | 'schoolYear'> & Pick<Student, 'observation' | 'photoUri'>;
// A edição não inclui o ID: ele identifica o estudante nas rotas e nos lembretes.
export type StudentEdits = Pick<Student, 'name' | 'className' | 'schoolYear' | 'observation'>;

// A união discriminada obriga a tela a tratar sucesso e erro separadamente.
export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };
