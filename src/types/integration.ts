import type { RecordModel } from 'pocketbase'

export type EstagioLead = 'novo' | 'qualificado' | 'proposta' | 'descartado'

export interface LeadRecord extends RecordModel {
  nome: string
  empresa: string
  email: string
  telefone?: string
  necessidade_identificada?: string
  problema_relatado?: string
  requisitos?: string
  solucao_sugerida?: string
  resumo_conversa?: string
  estagio_do_lead: EstagioLead
  proximo_passo?: string
  request_id?: string
  created: string
  updated: string
}

export interface ToolLogRecord extends RecordModel {
  ferramenta: string
  resultado: 'sucesso' | 'erro'
  error_code?: string
  request_id: string
  duracao_ms: number
  http_status: number
  created: string
  updated: string
}

export type StatusMeeting = 'pendente' | 'confirmada' | 'cancelada' | 'realizada'

export interface MeetingRecord extends RecordModel {
  nome: string
  empresa: string
  email: string
  telefone: string
  data_hora: string
  assunto: string
  observacoes?: string
  status: StatusMeeting
  request_id?: string
  created: string
  updated: string
}

export interface ToolDefinition {
  nome: string
  descricao: string
  escopo: string
  endpoint: string
  metodo: string
  status: 'ativa' | 'inativa'
}
