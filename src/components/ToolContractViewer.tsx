import { useState } from 'react'
import { FileText, BookmarkCheck, Search, Sparkles, Layers, ArrowRight, Info } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  V1_CONVENTIONS,
  TOOL_CONTRACT_METADATA,
  TOOL_CONTRACT_SECTIONS,
  type ToolContractSection,
} from '@/data/toolContractData'

interface ToolContractViewerProps {
  onCopyText?: (text: string, label: string) => void
}

export function ToolContractViewer({ onCopyText }: ToolContractViewerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)

  const filteredSections = TOOL_CONTRACT_SECTIONS.filter((sec) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      sec.title.toLowerCase().includes(term) ||
      sec.content.toLowerCase().includes(term) ||
      `seção ${sec.number}`.includes(term) ||
      sec.number.toString() === term.trim()
    )
  })

  const scrollToSection = (id: string) => {
    setSelectedSectionId(id)
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const fullContractMarkdown = `# ${TOOL_CONTRACT_METADATA.title}
## ${TOOL_CONTRACT_METADATA.subtitle}
### ${TOOL_CONTRACT_METADATA.tool}

**Status:** ${TOOL_CONTRACT_METADATA.status}
**Objetivo:** ${TOOL_CONTRACT_METADATA.objective}

---
### Convenções da V1
${V1_CONVENTIONS.paragraphs[0]}

${V1_CONVENTIONS.paragraphs[1]}
---

${TOOL_CONTRACT_SECTIONS.map((sec) => {
  let text = `## ${sec.number}. ${sec.title}\n\n${sec.content}`
  if (sec.codeBlocks) {
    sec.codeBlocks.forEach((cb) => {
      text += `\n\n\`\`\`${cb.language}\n${cb.code}\n\`\`\``
    })
  }
  return text
}).join('\n\n')}`

  return (
    <div className="space-y-6">
      {/* Header do Contrato */}
      <Card className="border-teal-200 bg-white shadow-2xs">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-[#0F766E] text-white text-xs font-semibold">
                  Tool Contract
                </Badge>
                <Badge variant="outline" className="border-teal-300 text-teal-800 text-xs">
                  {TOOL_CONTRACT_METADATA.tool}
                </Badge>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                  {TOOL_CONTRACT_METADATA.status}
                </Badge>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
                {TOOL_CONTRACT_METADATA.subtitle}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
                <strong>Objetivo:</strong> {TOOL_CONTRACT_METADATA.objective}
              </p>
            </div>

            {onCopyText && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onCopyText(fullContractMarkdown, 'Tool Contract completo (Markdown)')
                }
                className="self-start lg:self-center border-teal-200 text-teal-800 hover:bg-teal-50 text-xs"
              >
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                Copiar Tool Contract Completo
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Convenções da V1 - Destacada no topo */}
      <Card
        id="convencoes-v1"
        className="border-amber-300 bg-linear-to-br from-amber-50/90 to-amber-100/50 shadow-2xs scroll-mt-20"
      >
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BookmarkCheck className="h-5 w-5 text-amber-700" />
            <Badge className="bg-amber-200 text-amber-900 border-amber-300 text-xs font-semibold">
              Regra Mandatória
            </Badge>
            <CardTitle className="text-base font-bold text-amber-950">
              {V1_CONVENTIONS.title}
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-amber-800">
            Convenções comportamentais obrigatórias definidas para a versão 1 do Consultor Digital
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-1 text-xs sm:text-sm text-amber-950 leading-relaxed">
          <div className="p-3.5 rounded-lg bg-white/90 border border-amber-200 space-y-1.5 shadow-2xs">
            <span className="font-semibold text-amber-900 text-xs flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                1
              </span>
              Pessoa Física sem Empresa Associada
            </span>
            <p className="font-sans text-slate-800 pl-6.5 text-xs sm:text-[13px] leading-relaxed">
              {V1_CONVENTIONS.paragraphs[0]}
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-white/90 border border-amber-200 space-y-1.5 shadow-2xs">
            <span className="font-semibold text-amber-900 text-xs flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                2
              </span>
              Idempotência e Múltiplas Oportunidades
            </span>
            <p className="font-sans text-slate-800 pl-6.5 text-xs sm:text-[13px] leading-relaxed">
              {V1_CONVENTIONS.paragraphs[1]}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Grid com Sumário / Índice Lateral + Conteúdo das 32 Seções */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sumário / Índice Interativo */}
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="sticky top-20 space-y-3">
            <Card className="border-slate-200 bg-white shadow-2xs">
              <CardHeader className="p-3.5 pb-2 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#0F766E]" />
                    Índice das 32 Seções
                  </span>
                  <Badge variant="secondary" className="text-[10px] bg-slate-100">
                    {filteredSections.length} de 32
                  </Badge>
                </div>
                {/* Campo de Busca Rápida no Sumário */}
                <div className="relative mt-2">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Filtrar seções..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 pl-8 text-xs bg-slate-50 border-slate-200"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-2 max-h-[calc(100vh-220px)] overflow-y-auto space-y-0.5 text-xs">
                {/* Link fixo para Convenções V1 */}
                <button
                  type="button"
                  onClick={() => scrollToSection('convencoes-v1')}
                  className="w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-amber-900 bg-amber-50/80 hover:bg-amber-100/80 flex items-center justify-between transition-colors mb-1 border border-amber-200/60"
                >
                  <span className="truncate">★ Convenções da V1</span>
                  <ArrowRight className="h-3 w-3 shrink-0 text-amber-700" />
                </button>

                {filteredSections.map((sec) => {
                  const isSelected = selectedSectionId === sec.id
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => scrollToSection(sec.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] transition-colors flex items-center justify-between gap-1.5 ${
                        isSelected
                          ? 'bg-teal-50 text-[#0F766E] font-semibold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <span className="truncate">
                        <strong className="text-slate-800 font-mono text-[10px] mr-1">
                          {sec.number}.
                        </strong>
                        {sec.title}
                      </span>
                      {sec.codeBlocks && sec.codeBlocks.length > 0 && (
                        <span className="shrink-0 text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-500 font-mono">
                          código
                        </span>
                      )}
                    </button>
                  )
                })}

                {filteredSections.length === 0 && (
                  <p className="text-center py-4 text-xs text-slate-400">
                    Nenhuma seção encontrada para &quot;{searchTerm}&quot;
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="p-3 rounded-lg border border-teal-100 bg-teal-50/60 text-[11px] text-teal-900 leading-relaxed">
              <span className="font-semibold block mb-0.5 flex items-center gap-1">
                <Info className="h-3.5 w-3.5 text-teal-700" />
                Princípio Canônico
              </span>
              O Consultor decide <strong>quando registrar</strong>. A Integration Layer decide{' '}
              <strong>como executar corretamente</strong>.
            </div>
          </div>
        </div>

        {/* Lista Completa das 32 Seções do Documento */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {filteredSections.map((sec) => (
            <SectionCard key={sec.id} section={sec} onCopyText={onCopyText} />
          ))}

          {filteredSections.length === 0 && (
            <Card className="border-slate-200 bg-white p-8 text-center">
              <p className="text-sm text-slate-500">
                Nenhuma seção corresponde ao termo pesquisado.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchTerm('')}
                className="mt-3 text-xs"
              >
                Limpar busca
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionCard({
  section,
  onCopyText,
}: {
  section: ToolContractSection
  onCopyText?: (text: string, label: string) => void
}) {
  return (
    <Card
      id={section.id}
      className="border-slate-200 bg-white shadow-2xs scroll-mt-20 transition-all hover:border-slate-300"
    >
      <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#0F766E] text-white text-xs font-bold font-mono">
              {section.number}
            </span>
            <CardTitle className="text-sm sm:text-base font-bold text-slate-900">
              {section.title}
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-500">
            Seção {section.number}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 space-y-3">
        {/* Texto da Seção com formatação preservada */}
        <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2 whitespace-pre-line font-sans">
          {section.content}
        </div>

        {/* Blocos de Código ou Diagramas Textuais */}
        {section.codeBlocks && section.codeBlocks.length > 0 && (
          <div className="space-y-2.5 pt-2">
            {section.codeBlocks.map((cb, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden shadow-xs"
              >
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400 font-mono">
                  <span>{cb.caption || `Exemplo ${idx + 1}`}</span>
                  {onCopyText && (
                    <button
                      type="button"
                      onClick={() =>
                        onCopyText(cb.code, `${section.title} - ${cb.caption || 'bloco de código'}`)
                      }
                      className="text-[10px] text-teal-400 hover:text-teal-300 hover:underline cursor-pointer"
                    >
                      Copiar
                    </button>
                  )}
                </div>
                <div className="p-3 text-[11px] sm:text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre leading-relaxed">
                  {cb.code}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
