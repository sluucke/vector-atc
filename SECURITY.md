# Política de segurança

## Relatando uma vulnerabilidade

**Não abra uma *issue* pública** para falhas de segurança.

Use o recurso
[Report a vulnerability](https://github.com/sluucke/vector-atc/security/advisories/new)
do GitHub, na aba *Security* do repositório. Descreva:

- o que é afetado (rota, componente, script);
- como reproduzir;
- o impacto que você enxerga.

Respondemos assim que possível e avisamos quando a correção for publicada.

## Escopo

Pontos sensíveis do projeto:

- o login com a conta IVAO (OAuth/OIDC) e o cookie de sessão criptografado;
- as rotas em `src/app/api/`;
- as credenciais em variáveis de ambiente (`IVAO_CLIENT_SECRET`,
  `IVAO_API_KEY`), que nunca devem chegar ao navegador.

O par de API do AISWEB que vem no código é público: é o mesmo que o próprio
site do AISWEB envia ao navegador. Ele não é segredo.

## Versões suportadas

Só a versão em produção ([vectoratc.vercel.app](https://vectoratc.vercel.app))
e o branch `main` recebem correções.
