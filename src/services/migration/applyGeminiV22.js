import { planRepo, investmentsRepo } from 'src/services/repositories'

function itemDuplicado(lista, item) {
  return lista.some(
    (i) =>
      i.desc === item.desc &&
      i.valor === item.valor &&
      i.vencimentoDia === item.vencimentoDia
  )
}

function entradaDuplicada(lista, entrada) {
  return lista.some((e) => e.dia === entrada.dia && e.valor === entrada.valor)
}

/**
 * Grava o resultado da conversão do Gemini v22 nos arquivos `.txt`.
 * `replace: false` mescla meses e itens sem duplicar.
 */
export async function applyGeminiV22(result, { replace = true } = {}) {
  const atual = await planRepo.load()
  const mesesAtuais = Array.isArray(atual?.meses) ? atual.meses : []
  let meses

  if (replace || !mesesAtuais.length) {
    meses = result.plan.meses
  } else {
    const mapa = new Map(mesesAtuais.map((m) => [m.id, m]))
    for (const importado of result.plan.meses) {
      const existente = mapa.get(importado.id)
      if (!existente) {
        mapa.set(importado.id, importado)
        continue
      }
      for (const item of importado.itens) {
        if (!itemDuplicado(existente.itens, item)) existente.itens.push(item)
      }
      for (const entrada of importado.entradas) {
        if (!entradaDuplicada(existente.entradas, entrada)) existente.entradas.push(entrada)
      }
    }
    meses = [...mapa.values()]
  }

  meses.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  await planRepo.saveNow({ meses })

  if (result.investments.length) {
    const atuais = replace ? [] : await investmentsRepo.load()
    let finais = result.investments
    if (!replace) {
      const tickers = new Set(
        atuais.map((i) => String(i.ticker || '').toUpperCase()).filter(Boolean)
      )
      finais = [
        ...atuais,
        ...result.investments.filter((i) => {
          const ticker = String(i.ticker || '').toUpperCase()
          return ticker ? !tickers.has(ticker) : true
        }),
      ]
    }
    await investmentsRepo.saveNow(finais)
  }

  return result.summary
}
