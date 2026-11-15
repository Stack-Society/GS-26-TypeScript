# Ficha da CitizenTech — AprendIA

## Integrantes

| Nome | RM |
| --- | --- |
| Leonardo Fernandes Mesquita | 559623 |
| Vitor de Lima Domingues | 561008 |
| Giovanni Romano Provazi | 560434 |
| Caio Berardo de Araújo | 560357 |
| Felipe Carlos Abreu | 559476 |

| Campo | Informação |
| --- | --- |
| Nome | AprendIA |
| Cidade e bairro | Aplicativo demonstrado com exemplos fictícios, sem delimitação por cidade ou bairro. |
| Cidadão beneficiado | Professores que acompanham estudantes com lacunas de aprendizagem; os exemplos fictícios do aplicativo são do 7º ano. |
| Problema, em uma frase | Professores não têm um jeito rápido e padronizado de saber em quais conteúdos cada aluno está abaixo do esperado para a sua série, nem o que fazer a respeito. |
| Como funciona | O professor se identifica, consulta estudantes, cadastra registros, atualiza observações e agenda lembretes de acompanhamento. |
| O que cada parte faz | O aplicativo mobile oferece identificação do professor, lista, cadastro, detalhes e edição de estudantes, fotos e lembretes locais. |
| Link do repositório | https://github.com/Stack-Society/GS-26-TypeScript |
| Indicador de impacto | Indicadores propostos para uma avaliação futura: quantidade de estudantes acompanhados e tempo entre o registro de uma observação e a revisão pedagógica. O aplicativo não calcula esses indicadores automaticamente. |
| ODS conectados | ODS 4 — Educação de qualidade; ODS 10 — Redução das desigualdades. |
| Referências | BNCC; SAEB; Compromisso Nacional Criança Alfabetizada (MEC). |

## Contribuição para as ODS

O acompanhamento de dificuldades de aprendizagem ajuda o professor a planejar intervenções (ODS 4). A organização dos registros pode ajudar a priorizar estudantes que precisam de apoio (ODS 10). O impacto ainda não foi medido.

## Aplicativo mobile

Aplicativo React Native e Expo para o professor acompanhar estudantes com dificuldades de aprendizagem. As cinco telas são identificação, lista, cadastro, detalhes e edição. A interface usa cores, cartões e organização inspirados nos protótipos Stitch fornecidos. Os registros iniciais do 7º ano e seus indicadores pedagógicos são fictícios, usados somente para demonstração; o aplicativo não calcula diagnósticos nem consulta uma base curricular externa.

Tecnologias: Expo SDK 58, React Native, TypeScript estrito, React Navigation, AsyncStorage, Expo Image Picker, Expo File System, Expo Notifications e seletor nativo de data e hora. Os dados são locais, sem servidor.

## Instalação e execução

Com Node.js, npm e Expo Go instalado no celular:

```bash
npm install
npx expo start --clear
```

Abra o QR code no Expo Go. O celular e o computador devem conseguir se comunicar pela mesma rede. Para conferir os tipos e o lint:

```bash
npx tsc --noEmit
npx expo lint
```

## Fluxo de uso

No primeiro acesso, crie um nome ou apelido e um código fictício para o professor. É possível cadastrar mais de um professor no aparelho. Nas entradas seguintes, use o mesmo nome e código; a sessão permanece ao reabrir o aplicativo. **Sair da conta** encerra a sessão, mas preserva os cadastros locais.

A lista apresenta três estudantes fictícios de demonstração e os novos cadastros. Ela trata carregamento, erro e ausência de dados. O professor pode cadastrar um estudante fictício com nome, código único, turma e ano escolar. O campo de ano aceita `7` ou `7º ano`; ambos são guardados como `7º ano`. Foto e observação são opcionais. Nos detalhes, é possível consultar o registro, trocar ou remover a foto, e criar um lembrete para uma data e hora futuras. Somente estudantes adicionados pelo usuário podem ter nome, turma, ano e observação editados ou ser excluídos. O código único permanece fixo.

A câmera solicita permissão quando necessária; a galeria abre o seletor de imagens do sistema. Se a permissão da câmera for negada, o aplicativo explica o motivo e oferece acesso às configurações quando apropriado. O lembrete usa uma notificação local e também trata a recusa de permissão. O horário de entrega pode variar conforme as configurações do dispositivo. O professor pode adicionar uma foto ao próprio avatar na lista.

## Dados e limites

Os três estudantes iniciais, seus status, habilidades BNCC, metas e percentuais foram criados para demonstração. Não há diagnóstico automático, integração com sistemas escolares ou envio de dados a um servidor. Os cadastros de professores e estudantes são compartilhados localmente neste protótipo. O AsyncStorage não é criptografado: use apenas dados fictícios e imagens fictícias ou autorizadas, nunca dados pessoais reais de estudantes.

Os fluxos de entrada, cadastro, edição, exclusão, fotos e lembrete foram conferidos pelo usuário no Samsung S25 Ultra com Expo Go. O projeto também passou por verificação de TypeScript, lint e geração dos bundles Android e iOS.
