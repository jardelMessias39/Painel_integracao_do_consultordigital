import { useState } from 'react'
import {
  FileCode2,
  Copy,
  Check,
  KeyRound,
  Server,
  AlertTriangle,
  Layers,
  BookOpen,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { INTEGRATION_CONFIG } from '@/services/toolRegistry'
import { useToast } from '@/hooks/use-toast'
import { ToolContractViewer } from '@/components/ToolContractViewer'

export default function Documentacao() {
  const { toast } = useToast()
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null)

  const publicBaseUrl = INTEGRATION_CONFIG.publicDomain
  const publicEndpoint = `${publicBaseUrl}${INTEGRATION_CONFIG.publicEndpointPath}`
  const internalBaseUrl = INTEGRATION_CONFIG.backendUrl
  const internalEndpoint = `${internalBaseUrl}${INTEGRATION_CONFIG.internalEndpointPath}`

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedSnippet(label)
    toast({
      title: 'Copiado para a área de transferência',
      description: `${label} copiado com sucesso!`,
    })
    setTimeout(() => setCopiedSnippet(null), 2500)
  }

  // Exemplos de payloads
  const sampleRequestPayload = JSON.stringify(
    {
      nome: 'Carlos Eduardo Silva',
      empresa: 'LogiTech Transportes',
      email: 'carlos.silva@logitech.com.br',
      telefone: '(11) 98765-4321',
      necessidade_identificada: 'Automação no atendimento de motoristas parceiros',
      problema_relatado: 'Fila de espera de 45 minutos no WhatsApp',
      requisitos: 'Integração via Webhook com TMS interno',
      solucao_sugerida: 'Consultor Digital com triagem e webhook de tickets',
      resumo_conversa:
        'Conversa no site tirando dúvidas sobre tempo de implantação e SLA de resposta.',
      estagio_do_lead: 'proposta',
      proximo_passo: 'Enviar proposta comercial com piloto de 14 dias',
    },
    null,
    2,
  )

  const sampleSuccessCreated = JSON.stringify(
    {
      ok: true,
      data: {
        lead_id: 'c1hsdzu85woiyu6',
        estagio_do_lead: 'proposta',
        created_at: '2026-09-22 02:58:37.277Z',
        duplicado: false,
      },
    },
    null,
    2,
  )

  const sampleSuccessDuplicate = JSON.stringify(
    {
      ok: true,
      data: {
        lead_id: 'c1hsdzu85woiyu6',
        estagio_do_lead: 'proposta',
        created_at: '2026-09-22 02:58:37.277Z',
        duplicado: true,
      },
    },
    null,
    2,
  )

  const sampleErrorValidation = JSON.stringify(
    {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dados do lead inválidos. Corrija os campos e tente novamente.',
        details: [
          {
            field: 'email',
            message: "O campo 'email' informado não possui um formato válido de e-mail.",
          },
          {
            field: 'estagio_do_lead',
            message:
              "O campo 'estagio_do_lead' deve ser exatamente um dos valores permitidos: 'novo', 'qualificado', 'proposta' ou 'descartado'.",
          },
        ],
      },
    },
    null,
    2,
  )

  const curlExample = `curl -X POST "${publicEndpoint}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: <SUA_CONSULTOR_API_KEY>" \\
  -d '${sampleRequestPayload}'`

  const nodeExample = `// Chamada server-to-server a partir do backend do chatbot (Consultor Digital)
// Endpoint público funcional via domínio Skip Cloud (roteamento /api/*):
const INTEGRATION_LAYER_URL = '${publicEndpoint}';

async function registrarLeadConsultor(leadData) {
  const response = await fetch(INTEGRATION_LAYER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.CONSULTOR_API_KEY // Chave guardada no .env do backend
    },
    body: JSON.stringify(leadData)
  });

  const result = await response.json();
  if (!result.ok) {
    console.error('Falha ao registrar lead:', result.error.code, result.error.message);
    throw new Error(result.error.message);
  }

  // Sucesso: { lead_id, estagio_do_lead, created_at, duplicado }
  return result.data;
}`

  const consultorInstructionsBlock = `INTEGRAÇÃO COM A CAMADA DE LEADS — CONSULTOR DIGITAL (v1)

Esta camada foi construída exclusivamente para receber chamadas SERVER-TO-SERVER vindas do backend do seu chatbot "Consultor Digital". NUNCA coloque a chave de API no frontend ou no bundle do navegador!

1. ENDPOINT PÚBLICO DE PRODUÇÃO (POST):
   ${publicEndpoint}

   * Nota de infraestrutura: No domínio público do Skip Cloud (*.goskip.app), apenas o prefixo /api/
     é roteado ao backend PocketBase. Portanto a URL externa funcional é /api/backend/v1/tools/create_lead.
     O caminho /backend/v1/tools/create_lead permanece registrado para acesso interno/direto.

2. HEADERS OBRIGATÓRIOS:
   - Content-Type: application/json
   - X-API-Key: <SUA_CONSULTOR_API_KEY>

3. PAYLOAD JSON:
{
  "nome": "Nome Completo (obrigatório, máx 200)",
  "empresa": "Nome da Empresa (obrigatório, máx 200)",
  "email": "lead@empresa.com.br (obrigatório, válido)",
  "telefone": "(11) 99999-9999 (opcional, máx 30)",
  "necessidade_identificada": "Contexto capturado no chat (opcional, máx 2000)",
  "problema_relatado": "Dores relatadas pelo cliente (opcional, máx 2000)",
  "requisitos": "Requisitos de negócio/técnicos (opcional, máx 2000)",
  "solucao_sugerida": "Solução proposta pelo Consultor (opcional, máx 2000)",
  "resumo_conversa": "Transcrição resumida (opcional, máx 5000)",
  "estagio_do_lead": "novo" | "qualificado" | "proposta" | "descartado" (default: "novo"),
  "proximo_passo": "Ação recomendada (opcional, máx 500)"
}

4. ENVELOPE DE RESPOSTA ÚNICO:
- HTTP 201 (Novo lead criado):
  {
    "ok": true,
    "data": { "lead_id": "...", "estagio_do_lead": "...", "created_at": "...", "duplicado": false }
  }

- HTTP 200 (Lead existente com mesmo email + empresa):
  {
    "ok": true,
    "data": { "lead_id": "...", "estagio_do_lead": "...", "created_at": "...", "duplicado": true }
  }

- Em caso de erro (HTTP 400, 401, 429, 500):
  {
    "ok": false,
    "error": {
      "code": "VALIDATION_ERROR" | "UNAUTHORIZED" | "RATE_LIMITED" | "INTERNAL_ERROR",
      "message": "Mensagem descritiva",
      "details": [ { "field": "...", "message": "..." } ]
    }
  }

5. RATE LIMIT:
   Máximo de 120 requisições por minuto por chave. Resposta 429 RATE_LIMITED se excedido.`

  const [activeMainTab, setActiveMainTab] = useState<'tecnico' | 'comportamental'>('comportamental')

  return (
    <div className="space-y-6">
      {/* Abas Principais de Documentação: Técnico vs Comportamental */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Documentação &amp; Contratos do Sistema
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Especificações de engenharia e diretrizes comportamentais para o Consultor Digital V1
          </p>
        </div>

        <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200 shadow-2xs self-start sm:self-center">
          <button
            type="button"
            onClick={() => setActiveMainTab('comportamental')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeMainTab === 'comportamental'
                ? 'bg-white text-[#0F766E] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5 text-[#0F766E]" />
            <span>Tool Contract (Comportamental)</span>
            <Badge className="bg-teal-100 text-[#0F766E] hover:bg-teal-100 text-[10px] py-0 px-1.5 font-mono">
              32 seções
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('tecnico')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeMainTab === 'tecnico'
                ? 'bg-white text-[#0F766E] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Server className="h-3.5 w-3.5 text-[#0F766E]" />
            <span>Contrato Técnico da API</span>
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono border-slate-300">
              REST / v1
            </Badge>
          </button>
        </div>
      </div>

      {activeMainTab === 'comportamental' ? (
        <ToolContractViewer onCopyText={copyToClipboard} />
      ) : (
        <div className="space-y-6">
          <Card className="border-slate-200 bg-white shadow-2xs">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#0F766E]" />
                <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs">
                  ADR-001
                </Badge>
                <span className="text-xs text-slate-500">Arquitetura de Backend Desacoplada</span>
              </div>
              <CardTitle className="text-base font-bold text-slate-900 mt-1">
                Separação em Camadas: Transporte → Infra → Tool Registry → Domínio → Persistência
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                A capability de leads opera isolada do protocolo HTTP. Um futuro adaptador MCP
                poderá consumir a mesma lógica sem duplicação de regras de negócio ou de
                persistência.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="font-semibold text-slate-900 block mb-1">1. Transporte</span>
                  <p className="text-slate-600 text-[11px]">
                    Lê requisições HTTP, orquestra camadas e formata os envelopes estáveis. Zero
                    regra de negócio.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="font-semibold text-slate-900 block mb-1">2. Infraestrutura</span>
                  <p className="text-slate-600 text-[11px]">
                    Autenticação X-API-Key em tempo constante (fail-closed), rate limit (120
                    req/min) e audit logger unificado (LGPD).
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="font-semibold text-slate-900 block mb-1">3. Tool Registry</span>
                  <p className="text-slate-600 text-[11px]">
                    Catálogo de capabilities com contrato canônico (nome, escopo, inputSchema e
                    run).
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="font-semibold text-slate-900 block mb-1">4. Domínio</span>
                  <p className="text-slate-600 text-[11px]">
                    Regras de negócio, sanitização, enum fechado de estágio e idempotência
                    (email+empresa). Desacoplado de HTTP/PocketBase.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="font-semibold text-slate-900 block mb-1">5. Persistência</span>
                  <p className="text-slate-600 text-[11px]">
                    Adaptador PocketBase que implementa a porta do repositório. Único ponto de
                    contato com a coleção leads.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Banner de Roteamento de Infraestrutura do Skip Cloud */}
          <Card className="border-sky-200 bg-sky-50/40 shadow-2xs">
            <CardHeader className="pb-2 pt-3">
              <div className="flex items-start gap-2.5">
                <Server className="h-4 w-4 text-sky-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <CardTitle className="text-sm font-bold text-sky-950">
                    Roteamento do Domínio Público Skip (*.goskip.app)
                  </CardTitle>
                  <CardDescription className="text-xs text-sky-800 leading-relaxed">
                    No domínio público da plataforma Skip,{' '}
                    <strong>
                      apenas caminhos sob o prefixo{' '}
                      <code className="font-mono bg-sky-100/80 px-1 py-0.5 rounded text-sky-900">
                        /api/*
                      </code>{' '}
                      são roteados ao backend PocketBase
                    </strong>{' '}
                    (os demais caminhos recebem 405 do nginx ou caem no fallback da SPA). Portanto,
                    chamadores externos (como o Consultor Digital) devem utilizar a URL pública com
                    o prefixo:{' '}
                    <code className="font-mono bg-white border border-sky-200 px-1.5 py-0.5 rounded font-bold text-sky-900">
                      /api/backend/v1/tools/create_lead
                    </code>
                    . A rota{' '}
                    <code className="font-mono text-slate-600">/backend/v1/tools/create_lead</code>{' '}
                    permanece registrada e idêntica para compatibilidade e acesso direto ao host
                    interno do PocketBase.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Top Banner de Instruções Rápidas */}
          <Card className="border-teal-200 bg-white shadow-2xs">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-teal-100 text-teal-800 border-teal-200 text-xs">
                      Contrato da API v1
                    </Badge>
                    <span className="text-xs text-slate-500 font-mono">
                      POST {INTEGRATION_CONFIG.publicEndpointPath}
                    </span>
                  </div>
                  <CardTitle className="text-lg font-bold text-slate-900 mt-1">
                    Especificação da Ferramenta create_lead
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Guia de implementação para o backend do chatbot conectar à Camada de Integração
                  </CardDescription>
                </div>

                <Button
                  onClick={() =>
                    copyToClipboard(consultorInstructionsBlock, 'Instruções completas')
                  }
                  className="bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  {copiedSnippet === 'Instruções completas' ? (
                    <Check className="h-4 w-4 text-emerald-300" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span>Copiar Instruções para o Chatbot</span>
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Chave de API e Configurações de Conexão */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Card Chave de API */}
            <Card className="lg:col-span-2 border-slate-200 shadow-2xs bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-[#0F766E]" />
                  Autenticação: Header X-API-Key
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Todas as requisições devem incluir este token no cabeçalho{' '}
                  <code className="font-mono text-slate-800">X-API-Key</code>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 font-mono text-xs">
                  <span className="text-slate-500 select-none">Header:</span>
                  <span className="text-slate-900 font-semibold truncate flex-1">
                    X-API-Key: &lt;SUA_CONSULTOR_API_KEY&gt;
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard('X-API-Key: <SUA_CONSULTOR_API_KEY>', 'Header X-API-Key')
                    }
                    className="h-7 text-xs text-teal-800 hover:text-teal-900 hover:bg-teal-50 shrink-0"
                  >
                    {copiedSnippet === 'Header X-API-Key' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600 mr-1" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 mr-1" />
                    )}
                    {copiedSnippet === 'Header X-API-Key' ? 'Copiado!' : 'Copiar'}
                  </Button>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Atenção de Segurança:</strong> A chave real vive em segredo no backend
                    do Skip Cloud (<code className="font-mono">CONSULTOR_API_KEY</code>) e deve ser
                    configurada exclusivamente nas variáveis de ambiente do backend do seu chatbot (
                    <code className="font-mono">process.env.CONSULTOR_API_KEY</code>). NUNCA exponha
                    ou coloque o valor da chave no frontend, bundles Vite/React ou repositórios
                    públicos.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Card URL Base */}
            <Card className="border-slate-200 shadow-2xs bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Server className="h-4 w-4 text-blue-600" />
                  Endpoint URL (Pública)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  URL pública funcional no domínio Skip Cloud
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="p-2 rounded-lg border border-teal-200 bg-teal-50/50 font-mono text-xs text-teal-950 break-all">
                  <span className="text-[10px] text-teal-700 block font-sans font-medium mb-0.5">
                    URL Externa (Consultor Digital):
                  </span>
                  {publicEndpoint}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(publicEndpoint, 'URL Pública')}
                  className="w-full text-xs border-teal-200 text-teal-800 hover:bg-teal-50"
                >
                  {copiedSnippet === 'URL Pública' ? 'Copiado!' : 'Copiar URL Pública'}
                </Button>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-500 block mb-1">
                    Acesso direto / interno PocketBase:
                  </span>
                  <div className="p-1.5 rounded border border-slate-200 bg-slate-50 font-mono text-[11px] text-slate-600 break-all">
                    {internalEndpoint}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Campos Validados pelo Zod */}
          <Card className="border-slate-200 shadow-2xs bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">
                Esquema de Validação do Payload (Zod Schema)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Todos os campos são sanitizados e validados rigorosamente no servidor antes de
                qualquer gravação
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 font-medium text-slate-600 text-[11px]">
                      <th className="py-2.5 px-3">Campo</th>
                      <th className="py-2.5 px-3">Tipo</th>
                      <th className="py-2.5 px-3">Obrigatoriedade</th>
                      <th className="py-2.5 px-3">Regras / Valores Permitidos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">nome</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                      <td className="py-2.5 px-3">
                        <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                          Obrigatório
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">Máximo de 200 caracteres</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                        empresa
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                      <td className="py-2.5 px-3">
                        <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                          Obrigatório
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        Máximo de 200 caracteres (usado na chave de idempotência)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">email</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                      <td className="py-2.5 px-3">
                        <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                          Obrigatório
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        Formato de e-mail válido RFC, máx 200 caracteres
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                        telefone
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-slate-600 text-[10px]">
                          Opcional
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">Máximo de 30 caracteres</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                        necessidade_identificada
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-slate-600 text-[10px]">
                          Opcional
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">Máximo de 2000 caracteres</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                        problema_relatado
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-slate-600 text-[10px]">
                          Opcional
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">Máximo de 2000 caracteres</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                        requisitos
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-slate-600 text-[10px]">
                          Opcional
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">Máximo de 2000 caracteres</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                        solucao_sugerida
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-slate-600 text-[10px]">
                          Opcional
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">Máximo de 2000 caracteres</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                        resumo_conversa
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-slate-600 text-[10px]">
                          Opcional
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">Máximo de 5000 caracteres</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                        estagio_do_lead
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">enum fechado</td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant="outline"
                          className="text-teal-700 bg-teal-50 border-teal-200 text-[10px]"
                        >
                          Default "novo"
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 font-mono text-[11px]">
                        "novo" | "qualificado" | "proposta" | "descartado"
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                        proximo_passo
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-slate-600 text-[10px]">
                          Opcional
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">Máximo de 500 caracteres</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Códigos de Erro Estáveis */}
          <Card className="border-slate-200 shadow-2xs bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">
                Tabela de Códigos de Erro Estáveis
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                O envelope de erro segue sempre o formato{' '}
                <code className="font-mono text-slate-800">
                  &#123; ok: false, error: &#123; code, message, details &#125; &#125;
                </code>
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 font-medium text-slate-600 text-[11px]">
                      <th className="py-2.5 px-3">Código Estável</th>
                      <th className="py-2.5 px-3">HTTP Status</th>
                      <th className="py-2.5 px-3">Causa / Diagnóstico</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-red-700">VALIDATION_ERROR</td>
                      <td className="py-2.5 px-3 text-slate-700">400 Bad Request</td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">
                        Campos obrigatórios ausentes, e-mail inválido ou estágio fora do enum
                        fechado.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-amber-700">UNAUTHORIZED</td>
                      <td className="py-2.5 px-3 text-slate-700">401 Unauthorized</td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">
                        Header <code className="font-mono text-xs">X-API-Key</code> ausente ou não
                        confere com o token configurado.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-purple-700">RATE_LIMITED</td>
                      <td className="py-2.5 px-3 text-slate-700">429 Too Many Requests</td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">
                        Mais de 120 requisições enviadas no mesmo minuto pela mesma chave.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">INTERNAL_ERROR</td>
                      <td className="py-2.5 px-3 text-slate-700">500 Internal Error</td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">
                        Erro inesperado durante a execução do handler no banco de dados.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Exemplos de Código e Envelopes */}
          <Tabs defaultValue="curl" className="space-y-3">
            <TabsList className="bg-slate-100 border border-slate-200">
              <TabsTrigger value="curl" className="text-xs">
                cURL
              </TabsTrigger>
              <TabsTrigger value="node" className="text-xs">
                Node.js (Chatbot)
              </TabsTrigger>
              <TabsTrigger value="res_success" className="text-xs">
                Resposta Sucesso (201 / 200)
              </TabsTrigger>
              <TabsTrigger value="res_error" className="text-xs">
                Resposta Erro (400 / 401 / 429)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="curl">
              <Card className="border-slate-200 bg-slate-900 text-slate-100 shadow-sm">
                <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-slate-800">
                  <span className="text-xs font-mono text-slate-400">
                    Exemplo cURL via terminal
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(curlExample, 'Comando cURL')}
                    className="h-7 text-xs text-teal-400 hover:text-teal-300 hover:bg-slate-800"
                  >
                    {copiedSnippet === 'Comando cURL' ? 'Copiado!' : 'Copiar cURL'}
                  </Button>
                </CardHeader>
                <CardContent className="p-4 font-mono text-xs overflow-x-auto text-emerald-300 whitespace-pre">
                  {curlExample}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="node">
              <Card className="border-slate-200 bg-slate-900 text-slate-100 shadow-sm">
                <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-slate-800">
                  <span className="text-xs font-mono text-slate-400">
                    Node.js / Express / Next.js backend
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(nodeExample, 'Código Node.js')}
                    className="h-7 text-xs text-teal-400 hover:text-teal-300 hover:bg-slate-800"
                  >
                    {copiedSnippet === 'Código Node.js' ? 'Copiado!' : 'Copiar Código'}
                  </Button>
                </CardHeader>
                <CardContent className="p-4 font-mono text-xs overflow-x-auto text-slate-200 whitespace-pre">
                  {nodeExample}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="res_success">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-slate-200 bg-white shadow-2xs">
                  <CardHeader className="py-3 px-4 border-b border-slate-100">
                    <span className="text-xs font-semibold text-emerald-700">
                      HTTP 201 Created (Novo Lead)
                    </span>
                  </CardHeader>
                  <CardContent className="p-4 font-mono text-xs overflow-x-auto text-slate-800 bg-slate-50 rounded-b-lg">
                    <pre>{sampleSuccessCreated}</pre>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white shadow-2xs">
                  <CardHeader className="py-3 px-4 border-b border-slate-100">
                    <span className="text-xs font-semibold text-teal-700">
                      HTTP 200 OK (Lead Existente / Idempotência)
                    </span>
                  </CardHeader>
                  <CardContent className="p-4 font-mono text-xs overflow-x-auto text-slate-800 bg-slate-50 rounded-b-lg">
                    <pre>{sampleSuccessDuplicate}</pre>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="res_error">
              <Card className="border-slate-200 bg-white shadow-2xs">
                <CardHeader className="py-3 px-4 border-b border-slate-100">
                  <span className="text-xs font-semibold text-red-700">
                    HTTP 400 Bad Request (VALIDATION_ERROR)
                  </span>
                </CardHeader>
                <CardContent className="p-4 font-mono text-xs overflow-x-auto text-slate-800 bg-slate-50 rounded-b-lg">
                  <pre>{sampleErrorValidation}</pre>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
