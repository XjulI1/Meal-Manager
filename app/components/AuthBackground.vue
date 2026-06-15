<script setup lang="ts">
/**
 * Fond animé pour les pages d'authentification : une nuée d'aliments
 * qui flottent doucement en faux-3D (parallaxe à la souris + bob/rotation).
 *
 * 100 % CSS/SVG-free : on s'appuie sur des emojis pour rester sans dépendance
 * et léger (compatible PWA / offline). L'animation respecte
 * `prefers-reduced-motion` et n'intercepte aucun clic (`pointer-events: none`).
 */

const FOODS = [
  '🥕',
  '🍅',
  '🧅',
  '🥦',
  '🍆',
  '🌽',
  '🫑',
  '🥑',
  '🍋',
  '🍒',
  '🧄',
  '🥬',
  '🍞',
  '🧀',
  '🥚',
  '🫛',
  '🍄',
  '🌶️',
]

interface FloatingItem {
  emoji: string
  left: number // %
  top: number // %
  size: number // rem
  depth: number // 0 (loin) → 1 (proche) : pilote la parallaxe et l'opacité
  duration: number // s
  delay: number // s
  drift: number // px d'amplitude horizontale
  rotate: number // deg
}

// Pseudo-aléatoire déterministe (même rendu SSR/CSR, pas de mismatch d'hydratation).
function makeRng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

// Répartition en grille jitterée : un aliment par cellule, décalé
// aléatoirement à l'intérieur → couverture homogène, sans paquets ni trous.
const COLS = 6
const ROWS = 5

const items = computed<FloatingItem[]>(() => {
  const rng = makeRng(42)
  const result: FloatingItem[] = []
  let i = 0
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const depth = rng()
      // Centre de la cellule + jitter (60 % de la cellule), en gardant une marge.
      const cellW = 100 / COLS
      const cellH = 100 / ROWS
      const left = col * cellW + cellW * (0.2 + rng() * 0.6)
      const top = row * cellH + cellH * (0.2 + rng() * 0.6)
      result.push({
        emoji: FOODS[i % FOODS.length]!,
        left,
        top,
        size: 1.5 + depth * 3,
        depth,
        duration: 8 + rng() * 10,
        delay: -rng() * 12,
        drift: 10 + rng() * 30,
        rotate: (rng() - 0.5) * 40,
      })
      i++
    }
  }
  return result
})

// Parallaxe douce suivant la souris (désactivée si reduced-motion).
const pointer = reactive({ x: 0, y: 0 })
let reduceMotion = false

function onPointerMove(event: PointerEvent) {
  if (reduceMotion) return
  pointer.x = event.clientX / window.innerWidth - 0.5
  pointer.y = event.clientY / window.innerHeight - 0.5
}

onMounted(() => {
  reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!reduceMotion) window.addEventListener('pointermove', onPointerMove, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
})

function itemStyle(item: FloatingItem) {
  // Les éléments « proches » (depth élevé) bougent plus → effet de profondeur.
  const px = pointer.x * item.depth * 40
  const py = pointer.y * item.depth * 40
  return {
    left: `${item.left}%`,
    top: `${item.top}%`,
    fontSize: `${item.size}rem`,
    opacity: 0.25 + item.depth * 0.45,
    filter: `blur(${(1 - item.depth) * 1.5}px)`,
    '--drift': `${item.drift}px`,
    '--rotate': `${item.rotate}deg`,
    '--parallax-x': `${px}px`,
    '--parallax-y': `${py}px`,
    animationDuration: `${item.duration}s`,
    animationDelay: `${item.delay}s`,
  }
}
</script>

<template>
  <div class="auth-bg" aria-hidden="true">
    <div class="auth-bg__glow" />
    <span
      v-for="(item, index) in items"
      :key="index"
      class="auth-bg__item"
      :style="itemStyle(item)"
    >
      {{ item.emoji }}
    </span>
  </div>
</template>

<style scoped>
.auth-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

/* Halo coloré doux derrière la nuée pour donner du relief. */
.auth-bg__glow {
  position: absolute;
  inset: -20%;
  background:
    radial-gradient(40% 40% at 25% 30%, rgb(var(--ui-primary) / 0.18), transparent 70%),
    radial-gradient(45% 45% at 80% 70%, rgb(245 158 11 / 0.16), transparent 70%);
  filter: blur(20px);
}

.auth-bg__item {
  position: absolute;
  display: inline-block;
  line-height: 1;
  will-change: transform;
  user-select: none;
  transform: translate(var(--parallax-x, 0), var(--parallax-y, 0));
  animation-name: float;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  transition: transform 0.4s ease-out;
}

@keyframes float {
  0%,
  100% {
    transform: translate(var(--parallax-x, 0), var(--parallax-y, 0)) rotate(0deg);
  }
  50% {
    transform: translate(
        calc(var(--parallax-x, 0) + var(--drift)),
        calc(var(--parallax-y, 0) - 16px)
      )
      rotate(var(--rotate));
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-bg__item {
    animation: none;
    transition: none;
  }
}
</style>
