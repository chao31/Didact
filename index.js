// 创建节点
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child =>
        typeof child === "object" ? child : createTextElement(child)
      )
    }
  };
}

// 创建文本节点
function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: []
    }
  };
}

function createDom(fiber) {
  const dom =
      fiber.type == "TEXT_ELEMENT"
        ? document.createTextNode("")
        : document.createElement(fiber.type)

  updateDom(dom, {}, fiber.props);
  
  return dom
}

function render(element, container) {
  // 虽然后面会给这个对象添加更多属性，但这里是第一个 fiber
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot,
  }
  deletions = []
  nextUnitOfWork = wipRoot
}

// 判断是否是 dom 事件
const isEvent = key => key.startsWith("on")
// 不是 dom 事件，也不是 children 属性，才是要更新的属性
const isProperty = key =>
  key !== "children" && !isEvent(key)
// 判断是否是新属性
const isNew = (prev, next) => key =>
  prev[key] !== next[key]
// 判断属性是否被删除
const isGone = (prev, next) => key => !(key in next)
function updateDom(dom, prevProps, nextProps) {
  // 删除旧的 dom 事件监听函数
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(
      key =>
        !(key in nextProps) ||
        isNew(prevProps, nextProps)(key)
    )
    .forEach(name => {
      const eventType = name
        .toLowerCase()
        .substring(2)
      dom.removeEventListener(
        eventType,
        prevProps[name]
      )
    })

  // 删除旧的属性
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => {
      dom[name] = ""
    })

  // 设置新的属性
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      dom[name] = nextProps[name]
    })
  
  // 设置新的 dom 事件监听函数
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      const eventType = name
        .toLowerCase()
        .substring(2)
      dom.addEventListener(
        eventType,
        nextProps[name]
      )
    })
}

function commitRoot() {
  deletions.forEach(commitWork)
  commitWork(wipRoot.child)
  // commit 后，新 fiber 就变成了旧 fiber，更新一下旧 fiber
  currentRoot = wipRoot
  wipRoot = null
}

// 递归插入所有 dom
function commitWork(fiber) {
  if (!fiber) return

  // 函数组件会没有父 dom 的情况，所以一直往上递归
  let domParentFiber = fiber.parent
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent
  }
  const domParent = domParentFiber.dom

  if ( fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    // 插入新 dom
    domParent.appendChild(fiber.dom)
  } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
    // 更新 dom 属性
    updateDom(
      fiber.dom,
      fiber.alternate.props,
      fiber.props
    )
  } else if (fiber.effectTag === "DELETION") {
    // 删除 dom
    commitDeletion(fiber, domParent)
  }
  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

// 函数组件没有 dom，需要一直往上递归找父 dom
function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom)
  } else {
    commitDeletion(fiber.child, domParent)
  }
}

// 被拆分成的一个一个单元的小任务
let nextUnitOfWork = null
// 当有新 fiber root 后，会拿它跟当前 root fiber 做对比，所以需要缓存当前 root fiber
let currentRoot = null
let wipRoot = null
let deletions = null

function workLoop(deadline) {
  // requestIdleCallback 给 shouldYield 赋值，告诉我们浏览器是否空闲
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }

  // 没有下一个待渲染的fiber，表示所有dom渲染完成，commit到root
  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }

  // 循环调用 workLoop
  requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)

// 每次执行完一个单元任务（做了以下3件事），会返回下一个单元任务
// 1. 给fiber添加dom，并插入父元素
// 2. 给当前fiber的每一个子元素生成fiber节点
// 3. 找到要返回的下一个 unitOfWork
function performUnitOfWork(fiber) {
  const isFunctionComponent =
    fiber.type instanceof Function
  if (isFunctionComponent) {
    updateFunctionComponent(fiber)
  } else {
    updateHostComponent(fiber)
  }

  // 下面的操作是返回下一个单元——nextUnitOfWork
  // 1. 优先找child
  // 2. 没有child找兄弟
  // 3. 没有兄弟，找叔叔，也就是递归到父元素的兄弟
  // 4. 没有叔叔就一直往上递归...
  if (fiber.child) {
    return fiber.child
  }
  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent
  }
}

function updateHostComponent(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  reconcileChildren(fiber, fiber.props.children)
}

let wipFiber = null
let hookIndex = null

function updateFunctionComponent(fiber) {
  wipFiber = fiber
  hookIndex = 0
  wipFiber.hooks = []
  // 执行函数组件，返回jsx
  const children = [fiber.type(fiber.props)]
  reconcileChildren(fiber, children)
}

function useState(initial) {
  const oldFiber = wipFiber.alternate;
  const oldHook = oldFiber?.hooks && oldFiber.hooks[hookIndex];
  // 设置新 hook
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [],
  }

  // 执行老 hook 队列里的 setState 方法
  const actions = oldHook ? oldHook.queue : []
  actions.forEach(action => {
    hook.state = action(hook.state)
  })

  const setState = action => {
    hook.queue.push(action)
    // 设置 nextUnitOfWork，从而在下一次闲时启动更新
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    }
    nextUnitOfWork = wipRoot
    deletions = []
  }

  wipFiber.hooks.push(hook)
  hookIndex++
  return [hook.state, setState]
}


function reconcileChildren(wipFiber, elements) {
  let index = 0
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child
  let prevSibling = null

  // 1. 遍历当前 fiber 的 children
  // 2. 给 children 里的每个 child 指定 3 个指针，分别指向其 父、子、兄弟三个节点
  while (index < elements.length || oldFiber != null) {
    const element = elements[index]

    let newFiber = null

    const sameType =
      oldFiber &&
      element &&
      element.type == oldFiber.type

    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
      }
    }
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT",
      }
    }
    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION"
      deletions.push(oldFiber)
    }


    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }

    if (index === 0) {
      wipFiber.child = newFiber
    } else {
      prevSibling.sibling = newFiber
    }

    prevSibling = newFiber
    index++
  }
}



const Didact = {
  createElement,
  render,
  useState,
};

function Counter() {
  const [state, setState] = Didact.useState(1)
  return (
    <div>
      <button onClick={() => setState(c => c + 1)}>
        点击 + 1
      </button>
      <p>Count: {state}</p>
    </div>
  )
}
const profile = <Counter />

const container = document.getElementById("root")
Didact.render(profile, container)
