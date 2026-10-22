function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function filtroVazio() {
  return {
    texto: '',
    categoria: '',
    cartaoId: '',
    status: 'todos',
    valorMin: null,
    valorMax: null,
  }
}

export function filtroAtivo(filtros = {}) {
  return Boolean(
    String(filtros.texto || '').trim() ||
      filtros.categoria ||
      filtros.cartaoId ||
      (filtros.status && filtros.status !== 'todos') ||
      Number(filtros.valorMin) > 0 ||
      Number(filtros.valorMax) > 0
  )
}

/**
 * Filtra lançamentos por texto, categoria, cartão, status de pagamento e faixa de valor.
 * `texto` ignora acentos e caixa e procura na descrição e na categoria.
 */
function valorDe(item) {
  return Number(item?.valor ?? item?.amount ?? 0) || 0
}

export function filtrarItens(itens = [], filtros = {}) {
  const termo = normalizar(filtros.texto)
  const valorMin = Number(filtros.valorMin) > 0 ? Number(filtros.valorMin) : null
  const valorMax = Number(filtros.valorMax) > 0 ? Number(filtros.valorMax) : null

  return itens.filter((item) => {
    if (termo) {
      const alvo = `${normalizar(item.desc)} ${normalizar(item.categoria)}`
      if (!alvo.includes(termo)) return false
    }
    if (filtros.categoria && item.categoria !== filtros.categoria) return false
    if (filtros.cartaoId && item.cartaoId !== filtros.cartaoId) return false
    if (filtros.status === 'pendentes' && item.pago) return false
    if (filtros.status === 'pagos' && !item.pago) return false
    if (valorMin !== null && valorDe(item) < valorMin) return false
    if (valorMax !== null && valorDe(item) > valorMax) return false
    return true
  })
}

export function resumoFiltro(itens = []) {
  const total = itens.reduce((a, i) => a + valorDe(i), 0)
  const totalPago = itens
    .filter((i) => i.pago)
    .reduce((a, i) => a + (Number(i.valorPago ?? i.valor ?? i.amount) || 0), 0)
  return {
    quantidade: itens.length,
    total: Math.round(total * 100) / 100,
    totalPago: Math.round(totalPago * 100) / 100,
    totalPendente: Math.round((total - totalPago) * 100) / 100,
  }
}

export function categoriasDisponiveis(itens = []) {
  return [...new Set(itens.map((i) => i.categoria).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  )
}
