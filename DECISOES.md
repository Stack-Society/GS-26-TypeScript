# Decisões do aplicativo mobile — AprendIA

## Navegação

O aplicativo usa `NativeStackNavigator` do React Navigation porque o fluxo é linear e cada tela tem uma ação principal. A pilha contém identificação, lista, cadastro, detalhes e edição. Uma sessão local decide se a identificação ou as telas internas ficam acessíveis. A lista é a primeira tela após a entrada. Ao selecionar um aluno, a rota leva apenas o `studentId` tipado; os detalhes consultam os dados atuais pelo ID. O cadastro retorna à lista, que recarrega ao receber foco. A edição retorna aos detalhes, que também recarregam ao receber foco. A seta nativa do cabeçalho volta à tela anterior.

## Dados e tipagem

Não há API escolar conectada a este módulo. `services/studentService.ts` usa três estudantes fictícios iniciais e guarda novos cadastros no aparelho. Seus status, habilidades BNCC, metas e percentuais são dados de demonstração; o app não gera diagnóstico nem faz alinhamento curricular automático. Os serviços retornam `ServiceResult<T>` para distinguir sucesso e erro. A `FlatList<Student>` tem chave pelo ID e apresenta estados de carregamento, falha, vazio e dados carregados.

`interface` define professor e estudante, `type` define entradas, edições e respostas, e `enum` restringe a etapa escolar. `RootStackParamList` tipa as rotas e exige o ID em detalhes e edição. As funções puras de `utils/validation.ts` validam os formulários; o serviço repete a validação antes de salvar. O TypeScript usa `strict: true` e não há `any` no código do aplicativo.

## Persistência e regras de cadastro

AsyncStorage guarda a lista de professores, a sessão atual e a lista de estudantes. Mais de um professor pode ser registrado no mesmo aparelho, com códigos fictícios únicos. A entrada exige nome e código correspondentes; a sessão é recuperada ao reabrir. Sair remove a sessão, preservando os cadastros. Os estudantes são compartilhados entre os professores deste protótipo, sem autenticação remota. Dados locais não são criptografados, por isso a demonstração usa somente registros fictícios.

Fotos selecionadas são copiadas para arquivos persistentes do aplicativo, e o cadastro guarda seu URI. Trocar ou remover uma foto limpa o arquivo anterior. Os três alunos iniciais são protegidos contra edição e exclusão na interface e no serviço. Estudantes adicionados pelo usuário podem ter nome, turma, ano e observação alterados. O ID fica fixo para preservar a referência das rotas e dos lembretes. A exclusão pede confirmação, remove o cadastro e a foto e tenta cancelar lembretes futuros vinculados ao ID.

## Recursos nativos e permissões

A câmera e a galeria servem para o avatar do professor e dos estudantes. A câmera solicita permissão quando necessário; após recusa, há mensagem e acesso às configurações quando o sistema não permite nova pergunta. A galeria usa o seletor do sistema, sem acesso amplo à biblioteca. A foto é opcional e as iniciais aparecem como alternativa.

Nos detalhes do estudante, o professor escolhe data e hora em seletores nativos para uma notificação local única. O app rejeita horários passados, solicita permissão para notificações e mostra uma mensagem se ela for negada. No Android, tenta usar um canal próprio e recorre ao canal padrão se a criação falhar. O som padrão é solicitado; o sistema pode atrasar a entrega conforme as configurações do aparelho. O lembrete inclui o ID do aluno para permitir cancelamento ao excluí-lo. Lembretes criados antes dessa vinculação não podem ser identificados automaticamente.

## Interface e verificação

Os quatro protótipos Stitch orientaram cores, cartões, ícones e hierarquia visual. Formulários usam área segura, rolagem e ajuste ao teclado virtual. Os cabeçalhos limitam o texto em telas estreitas. A interface mantém os indicadores demonstrativos separados dos dados editáveis. Os fluxos principais foram conferidos no Samsung S25 Ultra com Expo Go; TypeScript, lint e bundles Android e iOS passaram. O projeto continua local e não envia informações a serviços externos.
