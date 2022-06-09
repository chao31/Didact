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

const Didact = {
  createElement,
};

const profile = (
  <div className="profile">
    <span className="profile-title">title</span>
    <h3 className="profile-content">content</h3>
    我是一段文本
  </div>
);

console.log('profile: ', profile);