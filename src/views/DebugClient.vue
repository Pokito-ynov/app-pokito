<template>
  <div class="debug-root">
    <h1>🎲 Pokito Debugger (Vue)</h1>

    <div id="auth-box" class="box" v-show="!connected">
      <h2>1. Connexion</h2>
      <input type="text" v-model="pseudo" placeholder="Pseudo" />
      <button @click="connect">Se connecter</button>
    </div>

    <div id="lobby-box" class="box" v-show="connected && !inGame">
      <h2>2. Lobby</h2>
      <div class="row">
        <button @click="createTable">Créer une Table</button>
        <div style="border-left: 1px solid #444; padding-left: 10px;">
          <input type="text" v-model="joinCode" placeholder="Code Table" />
          <button @click="joinTable">Rejoindre</button>
        </div>
      </div>
    </div>

    <div id="game-box" class="box" v-show="inGame">
      <h2>3. Jeu - Table <span id="table-id-display">{{ currentTableId ?? '?' }}</span></h2>
      <div id="players-list">{{ playersText }}</div>
      <hr />
      <button @click="startGame">Lancer la partie</button>

      <div id="controls" style="margin-top: 10px;">
        <h3>Actions</h3>
        <input type="number" v-model.number="betQty" placeholder="Quantité (ex: 2)" style="width: 60px;" />
        <input type="number" v-model.number="betVal" placeholder="Valeur (ex: 5)" style="width: 60px;" />
        <button @click="placeBet">Parier</button>
        <button @click="dudo" style="color: red;">Menteur ! (Dudo)</button>
      </div>

      <div id="my-hand" style="margin-top: 10px; color: yellow;">
        {{ myHandText }}
      </div>
    </div>

    <div class="box">
      <h2>Logs</h2>
      <div id="logs" class="logs">{{ logs }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed, ref } from 'vue'
import { io, Socket } from 'socket.io-client'

const socket = ref<Socket | null>(null)
const pseudo = ref('Guest1')
const connected = ref(false)
const inGame = ref(false)
const currentTableId = ref<string | null>(null)
const joinCode = ref('')
const players = ref<Array<{ pseudo: string }>>([])
const myHand = ref<Array<number>>([])
const logs = ref('')
const betQty = ref<number | null>(null)
const betVal = ref<number | null>(null)

const playersText = computed(() => {
  return players.value.length ? 'Joueurs: ' + players.value.map(p => p.pseudo).join(', ') : 'Joueurs: ...'
})

const myHandText = computed(() => {
  return myHand.value.length ? `Mes dés: ${myHand.value.join(', ')}` : 'Mes dés: ?'
})

function log(msg: string) {
  const time = new Date().toLocaleTimeString()
  logs.value += `[${time}] ${msg}\n`
  // keep logs size modest
  if (logs.value.length > 20000) logs.value = logs.value.slice(-20000)
}

function connect() {
  if (socket.value) return
  socket.value = io()
  socket.value.on('connect', () => {
    connected.value = true
    log(`Connected with ID: ${socket.value?.id}`)
    socket.value?.emit('guest:join', { pseudo: pseudo.value, avatar: 'default' })
  })

  socket.value.on('guest:joined', (data: any) => {
    log(`Logged in as ${data.pseudo}`)
  })

  socket.value.on('table:created', (data: any) => {
    const tableId = data?.table?.id ?? data?.tableId
    log(`Table created! Code: ${data.table?.code ?? 'unknown'}`)
    enterGameMode(tableId)
  })

  socket.value.on('table:joined', (data: any) => {
    const tableId = data?.table?.id ?? data?.tableId
    log(`Joined table ${tableId}`)
    enterGameMode(tableId)
  })

  socket.value.on('table:players', (data: any) => {
    players.value = (data.players || []).map((p: any) => ({ pseudo: p.pseudo }))
    log(`Players updated: ${players.value.map(p => p.pseudo).join(', ')}`)
  })

  socket.value.on('game:started', (data: any) => {
    log(`📢 GAME STARTED! Current player: ${data.currentPlayer}`)
  })

  socket.value.on('game:hand', (data: any) => {
    myHand.value = data.dice || []
    log(`Received hand: ${myHand.value.join(', ')}`)
  })

  socket.value.on('game:bet_placed', (data: any) => {
    log(`👉 ${data.pseudo} parie: ${data.quantity}x ${data.value}. Next: ${data.nextPlayer}`)
  })

  socket.value.on('game:showdown', (data: any) => {
    log('Showdown — reveal:')
    log(JSON.stringify(data.players, null, 2))
  })

  socket.value.on('game:error', (err: any) => {
    log(`❌ ERROR: ${err?.message ?? err}`)
  })
}

function createTable() {
  socket.value?.emit('table:create', { type: 'publique', joueursMax: 4 })
}

function joinTable() {
  const code = joinCode.value.trim()
  if (!code) return
  socket.value?.emit('table:join', { code })
}

function enterGameMode(tableId: string) {
  currentTableId.value = tableId
  inGame.value = true
}

function startGame() {
  if (!currentTableId.value) return
  socket.value?.emit('game:start', { tableId: currentTableId.value })
}

function placeBet() {
  const qty = betQty.value
  const val = betVal.value
  if (!currentTableId.value || !qty || !val) return
  socket.value?.emit('game:bet', { tableId: currentTableId.value, quantity: qty, value: val })
}

function dudo() {
  if (!currentTableId.value) return
  socket.value?.emit('game:dudo', { tableId: currentTableId.value })
}
</script>

<style scoped>
.debug-root { max-width: 900px; margin: 0 auto; padding: 20px; font-family: monospace; }
.box { border: 1px solid #333; padding: 15px; margin-bottom: 20px; border-radius: 4px; background: #f6f6f6; }
.row { display: flex; gap: 10px; align-items: center; }
#logs { height: 300px; overflow-y: auto; white-space: pre-wrap; background: #fff; padding: 8px; }
input, button { padding: 8px; margin: 5px 0; }
button { cursor: pointer; }
</style>
