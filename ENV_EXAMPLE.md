# Exemplo de Variáveis de Ambiente (Vite / Frontend)

Para configurar localmente ou na Vercel (Environment Variables):

```bash
# URL canônica do backend PocketBase (Skip Cloud)
# Na Vercel (Project Settings -> Environment Variables), configure:
# Key: VITE_POCKETBASE_URL
# Value: https://integracao-de-ferramentas-do-consultor-e38b8.shrd00.internal.goskip.dev
# Ambientes: Production, Preview, Development
VITE_POCKETBASE_URL=https://integracao-de-ferramentas-do-consultor-e38b8.shrd00.internal.goskip.dev

# VITE_PB_URL também é aceita como fallback caso você já tenha configurado com esse nome:
# VITE_PB_URL=https://integracao-de-ferramentas-do-consultor-e38b8.shrd00.internal.goskip.dev
```
