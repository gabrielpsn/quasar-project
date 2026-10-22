import { defineStore } from 'pinia'
import { planRepo } from 'src/services/repositories'
import { shortId } from 'src/utils/uuid'
import { cents } from 'src/utils/format'
import {
  addMonths,
  currentMonthKey,
  monthKeyFromParts,
  monthLabel,
  parseMonthKey,
} from 'src/utils/dates'
import {
  itensPendentes,
  pendenciasAnteriores,
  resumoMes,
} from 'src/services/calc/cashflow'

function sortMeses(meses) {
  return [...meses].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

export const usePlanStore = defineStore('plan', {
  state: () => ({
    meses: [],
    mesAtualId: null,
    loading: false,
    error: null,
    initialized: false,
  }),

  getters: {
    mesesOrdenados: (state) => sortMeses(state.meses),

    mesAtual: (state) => state.meses.find((m) => m.id === state.mesAtualId) || null,

    mesAtualRotulo: (state) => {
      const mes = state.meses.find((m) => m.id === state.mesAtualId)
      return mes ? mes.rotulo : monthLabel(state.mesAtualId || currentMonthKey())
    },

    pendenciasDoMesAtual: (state) => {
      if (!state.mesAtualId) return []
      return pendenciasAnteriores(sortMeses(state.meses), state.mesAtualId)
    },

    resumoAtual: (state) => {
      const mes = state.meses.find((m) => m.id === state.mesAtualId)
      if (!mes) return null
      const pendencias = pendenciasAnteriores(sortMeses(state.meses), state.mesAtualId)
      return resumoMes(mes, pendencias)
    },

    totalPendenteGeral: (state) =>
      cents(state.meses.reduce((acc, mes) => acc + itensPendentes(mes).reduce((a, i) => a + (Number(i.valor) || 0), 0), 0)),
  },

  actions: {
    async init() {
      if (this.initialized) return
      this.loading = true
      try {
        const data = await planRepo.load()
        this.meses = Array.isArray(data?.meses) ? data.meses : []
        const atualAindaExiste = this.mesAtualId && this.meses.some((m) => m.id === this.mesAtualId)
        if (!atualAindaExiste) {
          this.mesAtualId = this.meses.length ? sortMeses(this.meses)[0].id : currentMonthKey()
        }
        this.initialized = true
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async reload() {
      this.initialized = false
      await this.init()
    },

    persist() {
      return planRepo.save({ meses: this.meses })
    },

    async persistNow() {
      return planRepo.saveNow({ meses: this.meses })
    },

    setMesAtual(mesId) {
      this.mesAtualId = mesId
    },

    mes(mesId) {
      return this.meses.find((m) => m.id === mesId) || null
    },

    /**
     * Garante que o mês exista. Mês novo nasce vazio (sem herdar defaults).
     */
    ensureMes(mesId, { rotulo } = {}) {
      let mes = this.mes(mesId)
      if (!mes) {
        mes = {
          id: mesId,
          rotulo: rotulo || monthLabel(mesId),
          entradas: [],
          itens: [],
        }
        this.meses.push(mes)
        this.sortMeses()
      }
      return mes
    },

    sortMeses() {
      this.meses = sortMeses(this.meses)
    },

    /* ------------------------------------------------------------------ */
    /* Entradas                                                             */
    /* ------------------------------------------------------------------ */

    upsertEntrada(mesId, entrada) {
      const mes = this.ensureMes(mesId)
      const index = mes.entradas.findIndex((e) => e.id === entrada.id)
      const payload = {
        id: entrada.id || shortId('e'),
        dia: Number(entrada.dia) || 10,
        valor: cents(entrada.valor || 0),
        desc: entrada.desc || 'Recebimento',
      }
      if (index >= 0) mes.entradas.splice(index, 1, payload)
      else mes.entradas.push(payload)
      return this.persist()
    },

    removeEntrada(mesId, entradaId) {
      const mes = this.mes(mesId)
      if (!mes) return Promise.resolve(false)
      mes.entradas = mes.entradas.filter((e) => e.id !== entradaId)
      return this.persist()
    },

    /* ------------------------------------------------------------------ */
    /* Lançamentos                                                          */
    /* ------------------------------------------------------------------ */

    addItem(mesId, item) {
      const mes = this.ensureMes(mesId)
      const payload = {
        id: item.id || shortId('i'),
        desc: item.desc || '',
        valor: cents(item.valor || 0),
        categoria: item.categoria || 'Fixo',
        vencimentoDia: Number(item.vencimentoDia) || 10,
        mesRef: mesId,
        origem: item.origem || { tipo: 'manual' },
        parcelas: item.parcelas || null,
        cartaoId: item.cartaoId || null,
        dividaId: item.dividaId || null,
        pago: false,
        dataPagamento: null,
        valorPago: null,
      }
      mes.itens.push(payload)
      return this.persist()
    },

    updateItem(mesId, itemId, patch) {
      const mes = this.mes(mesId)
      if (!mes) return Promise.resolve(false)
      const index = mes.itens.findIndex((i) => i.id === itemId)
      if (index < 0) return Promise.resolve(false)
      mes.itens.splice(index, 1, {
        ...mes.itens[index],
        ...patch,
        valor: patch.valor !== undefined ? cents(patch.valor) : mes.itens[index].valor,
      })
      return this.persist()
    },

    removeItem(mesId, itemId) {
      const mes = this.mes(mesId)
      if (!mes) return Promise.resolve(false)
      mes.itens = mes.itens.filter((i) => i.id !== itemId)
      return this.persist()
    },

    /**
     * Marca / desmarca um lançamento como pago, exigindo a data de pagamento.
     */
    togglePago(mesId, itemId, { dataPagamento, valorPago } = {}) {
      const mes = this.mes(mesId)
      if (!mes) return Promise.resolve(false)
      const item = mes.itens.find((i) => i.id === itemId)
      if (!item) return Promise.resolve(false)

      if (item.pago) {
        item.pago = false
        item.dataPagamento = null
        item.valorPago = null
      } else {
        item.pago = true
        item.dataPagamento = dataPagamento || null
        item.valorPago = valorPago === undefined || valorPago === null ? item.valor : cents(valorPago)
      }
      return this.persist()
    },

    /* ------------------------------------------------------------------ */
    /* Parcelamento                                                         */
    /* ------------------------------------------------------------------ */

    /**
     * Cria um parcelamento: N lançamentos, um por mês consecutivo.
     * A última parcela absorve a diferença de centavos.
     */
    async addParcelamento({
      mesInicial,
      desc,
      valorTotal,
      parcelas,
      vencimentoDia,
      categoria = 'Cartão',
      cartaoId = null,
      dividaId = null,
    }) {
      const total = Math.max(1, Math.floor(parcelas || 1))
      const valor = cents(valorTotal || 0)
      const base = Math.floor((valor * 100) / total) / 100
      const valores = new Array(total).fill(base)
      valores[total - 1] = cents(base + (valor - cents(base * total)))

      const grupoId = shortId('grp')
      const criados = []

      for (let i = 0; i < total; i++) {
        const mesId = addMonths(mesInicial, i)
        this.ensureMes(mesId)
        const item = {
          id: shortId('i'),
          desc: total > 1 ? `${desc} (${i + 1}/${total})` : desc,
          valor: valores[i],
          categoria,
          vencimentoDia: Number(vencimentoDia) || 10,
          mesRef: mesId,
          origem: { tipo: 'parcelamento', parentId: grupoId },
          parcelas: { total, atual: i + 1, valorParcela: valores[i], grupoId },
          cartaoId,
          dividaId,
          pago: false,
          dataPagamento: null,
          valorPago: null,
        }
        this.mes(mesId).itens.push(item)
        criados.push(item)
      }

      await this.persist()
      return criados
    },

    /**
     * Clona um mês: entradas e lançamentos fixos (sem parcelas e sem pagamentos).
     */
    async cloneMes(origemId, destinoId) {
      const origem = this.mes(origemId)
      if (!origem) return null

      const destino = this.ensureMes(destinoId)
      destino.entradas = origem.entradas.map((e) => ({ ...e, id: shortId('e') }))
      destino.itens = origem.itens
        .filter((i) => !i.parcelas)
        .map((i) => ({
          ...i,
          id: shortId('i'),
          mesRef: destinoId,
          pago: false,
          dataPagamento: null,
          valorPago: null,
          origem: { tipo: 'recorrencia', parentId: origemId },
        }))

      await this.persist()
      return destino
    },

    /**
     * Cria os próximos meses a partir do mais recente, clonando o padrão.
     */
    async gerarMesesFuturos(quantidade) {
      const ordenados = sortMeses(this.meses)
      if (!ordenados.length) return []

      const ultimo = ordenados[ordenados.length - 1]
      const criados = []
      for (let i = 1; i <= quantidade; i++) {
        const destino = addMonths(ultimo.id, i)
        if (this.mes(destino)) continue
        await this.cloneMes(ultimo.id, destino)
        criados.push(destino)
      }
      return criados
    },

    /* ------------------------------------------------------------------ */
    /* Utilidades                                                           */
    /* ------------------------------------------------------------------ */

    mesesDisponiveis() {
      return sortMeses(this.meses)
    },

    proximoMes(mesId) {
      const ordenados = sortMeses(this.meses)
      const index = ordenados.findIndex((m) => m.id === mesId)
      if (index < 0 || index >= ordenados.length - 1) return null
      return ordenados[index + 1].id
    },

    mesAnterior(mesId) {
      const ordenados = sortMeses(this.meses)
      const index = ordenados.findIndex((m) => m.id === mesId)
      if (index <= 0) return null
      return ordenados[index - 1].id
    },

    mesKeyAtual() {
      return this.mesAtualId || currentMonthKey()
    },

    mesKeyDe(ano, mes) {
      return monthKeyFromParts(ano, mes)
    },

    parseMes(mesId) {
      return parseMonthKey(mesId)
    },
  },
})
