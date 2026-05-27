# Vue Animations

## Transition Component Usage

```vue
<template>
  <div>
    <button @click="show = !show">Toggle</button>

    <Transition name="fade">
      <p v-if="show" key="content">Animated content</p>
    </Transition>

    <Transition name="slide" mode="out-in">
      <p :key="currentView">{{ currentView }} content</p>
    </Transition>

    <TransitionGroup name="list" tag="ul" class="space-y-2">
      <li v-for="item in items" :key="item.id" class="list-item">
        {{ item.text }}
        <button @click="removeItem(item.id)">x</button>
      </li>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.slide-enter-active, .slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.slide-enter-from {
  transform: translateX(20px);
  opacity: 0;
}
.slide-leave-to {
  transform: translateX(-20px);
  opacity: 0;
}

.list-enter-active, .list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from, .list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
/* Smooth list reflow when removing */
.list-move {
  transition: transform 0.3s ease;
}
</style>
```

## Custom Transition Classes

```vue
<template>
  <Transition
    enter-active-class="animate__animated animate__fadeIn"
    leave-active-class="animate__animated animate__fadeOut"
  >
    <p v-if="show">Using Animate.css classes</p>
  </Transition>

  <Transition
    @before-enter="beforeEnter"
    @enter="enter"
    @after-enter="afterEnter"
    @before-leave="beforeLeave"
    @leave="leave"
    @after-leave="afterLeave"
  >
    <div v-if="show" class="custom-animated-box">JS-powered animation</div>
  </Transition>
</template>

<script setup>
function beforeEnter(el) {
  el.style.opacity = '0'
  el.style.transform = 'scale(0.5)'
}

function enter(el, done) {
  el.animate([
    { opacity: 0, transform: 'scale(0.5)' },
    { opacity: 1, transform: 'scale(1)' },
  ], {
    duration: 300,
    easing: 'ease-out',
  }).finished.then(done)
}

function afterEnter(el) {
  el.style.opacity = ''
  el.style.transform = ''
}

function beforeLeave(el) {
  el.style.opacity = '1'
}

function leave(el, done) {
  el.animate([
    { opacity: 1, transform: 'scale(1)' },
    { opacity: 0, transform: 'scale(0.5)' },
  ], {
    duration: 200,
    easing: 'ease-in',
  }).finished.then(done)
}

function afterLeave(el) {
  el.style.opacity = ''
  el.style.transform = ''
}
</script>
```

## Page Transitions with Router

```vue
<template>
  <router-view v-slot="{ Component, route }">
    <Transition name="page" mode="out-in">
      <component :is="Component" :key="route.path" />
    </Transition>
  </router-view>
</template>

<style scoped>
.page-enter-active, .page-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
```

## List Animations

```vue
<template>
  <div>
    <input v-model="newItem" @keyup.enter="addItem" placeholder="Add item..." />

    <TransitionGroup
      name="list-complete"
      tag="ul"
      class="space-y-2"
    >
      <li
        v-for="item in items"
        :key="item.id"
        class="flex items-center gap-2 p-2 bg-white rounded shadow"
      >
        <span>{{ item.text }}</span>
        <button @click="removeItem(item.id)" class="text-red-500 ml-auto">
          Remove
        </button>
      </li>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.list-complete-enter-active {
  transition: all 0.4s ease;
}
.list-complete-leave-active {
  transition: all 0.3s ease;
  position: absolute;
}
.list-complete-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}
.list-complete-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
.list-complete-move {
  transition: transform 0.4s ease;
}
</style>

<script setup>
import { ref } from 'vue'

let id = 0
const items = ref([
  { id: id++, text: 'Item 1' },
  { id: id++, text: 'Item 2' },
  { id: id++, text: 'Item 3' },
])
const newItem = ref('')

function addItem() {
  if (!newItem.value.trim()) return
  items.value.push({ id: id++, text: newItem.value })
  newItem.value = ''
}

function removeItem(id) {
  const index = items.value.findIndex(i => i.id === id)
  if (index > -1) items.value.splice(index, 1)
}
</script>
```

## Animation Composables

```typescript
import { ref, onMounted, onUnmounted } from 'vue'

function useAnimationFrame(callback: (delta: number) => void) {
  const running = ref(false)
  let lastTime = 0
  let frameId: number | null = null

  function tick(time: number) {
    if (!running.value) return
    const delta = time - lastTime
    lastTime = time
    callback(delta)
    frameId = requestAnimationFrame(tick)
  }

  function start() {
    if (running.value) return
    running.value = true
    lastTime = performance.now()
    frameId = requestAnimationFrame(tick)
  }

  function stop() {
    running.value = false
    if (frameId !== null) {
      cancelAnimationFrame(frameId)
      frameId = null
    }
  }

  onUnmounted(stop)

  return { start, stop, running }
}

function useIntersectionAnimation(
  el: Ref<HTMLElement | null>,
  options: IntersectionObserverInit = {}
) {
  const visible = ref(false)

  onMounted(() => {
    if (!el.value) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        visible.value = true
        observer.disconnect()
      }
    }, { threshold: 0.1, ...options })

    observer.observe(el.value)
  })

  return visible
}
```

## Key Points

- Use Transition component for single element transitions
- Use TransitionGroup for list enter/leave/move animations
- Use mode="out-in" for page transitions to prevent layout overlap
- Provide unique key attributes for TransitionGroup items
- Use JavaScript hooks for complex programmatic animations
- Leverage CSS transition and animation properties for performant motion
- Position leaving elements absolutely to allow smooth list reflow
- Use the Web Animations API for JS-powered animations
- Create animation composables for reusable animation logic
- Respect prefers-reduced-motion for accessibility
- Use intersection observer for scroll-triggered animations
- Keep animation durations under 300ms for responsive feel
