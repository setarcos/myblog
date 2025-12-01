// Disqus懒加载脚本
function initDisqus() {
  var disqus_config = function () {
    var container = document.getElementById("disqus_thread_container");
    this.page.url = container.getAttribute("data-page-url");
    this.page.identifier = container.getAttribute("data-page-identifier");
  };

  // 检测用户是否已滚动到评论区
  function handleIntersection(entries) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // 如果评论区在视图中，且评论尚未加载，则加载评论
        if (!window.disqusLoaded) {
          loadDisqus();
        }
        // 取消观察，因为我们只需要加载一次
        observer.unobserve(entry.target);
      }
    });
  }

  // 懒加载Disqus评论的函数
  window.loadDisqus = function () {
    if (window.disqusLoaded) return;
    window.disqusLoaded = true;

    // 隐藏加载按钮
    document.getElementById("load-disqus").style.display = "none";

    // 加载Disqus
    var d = document,
      s = d.createElement("script");
    s.src = "https://" + DISQUS_SHORTNAME + ".disqus.com/embed.js";
    s.setAttribute("data-timestamp", +new Date());
    (d.head || d.body).appendChild(s);
  };

  // 创建Intersection Observer
  var observer = new IntersectionObserver(handleIntersection, {
    rootMargin: "0px 0px 200px 0px", // 当评论区距离视图底部200px时开始加载
  });

  // 设置观察者
  var commentContainer = document.getElementById("disqus_thread_container");
  if (commentContainer) {
    observer.observe(commentContainer);
  }
}

// 页面加载完成后初始化
document.addEventListener("DOMContentLoaded", initDisqus);
