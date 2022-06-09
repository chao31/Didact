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

function render(element, container) {
  const dom = element.type == "TEXT_ELEMENT"
    ? document.createTextNode("")
    : document.createElement(element.type)

  // children 被放到了 props 属性里，这里过滤掉 children
  const isProperty = key => key !== "children"

  Object.keys(element.props)
    .filter(isProperty)
    // 设置 dom 元素的属性，这里是简化版意思一下，直接赋值
    .forEach(name => dom[name] = element.props[name])
  
  // 递归子元素
  element.props.children.forEach(child =>render(child, dom))

  container.appendChild(dom)
}

const Didact = {
  createElement,
  render,
};

const profile = (
  <div className="profile">
    <span className="profile-title">title</span>
    <h3 className="profile-content">content</h3>
    我是一段文本
  </div>
);

const container = document.getElementById("root")
Didact.render(profile, container)
