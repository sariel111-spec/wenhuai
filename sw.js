// 缓存版本号，以后如果改动极大可以修改这个名字强制刷新所有人的缓存
const CACHE_NAME = 'yume-chat-cache-20260720-phone-focus-v11';

// 1. 安装阶段：强制立刻接管控制权，不等待旧版本浏览器关闭
self.addEventListener('install', event => {
    self.skipWaiting();
});

// 2. 激活阶段：清理旧版本的残留缓存，并立刻控制当前所有打开的网页
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName); // 删掉旧缓存
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. 抓取阶段：核心！网络优先 (Network First) 策略
self.addEventListener('fetch', event => {
    // 只处理 GET 请求
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
        .then(response => {
            // ① 如果手机有网，且拉取成功，就把最新拉到的代码/资源存进缓存
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
            });
            return response; // 网页永远显示刚拉到的最新内容
        })
        .catch(() => {
            // ② 如果手机断网了 (fetch 报错)，就从缓存里找上次存的备用版本
            return caches.match(event.request);
        })
    );
});

// 4. 处理系统弹窗通知的点击事件 (你代码里如果以后要加通知的话，这个能唤醒APP)
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if ('focus' in client) return client.focus(); 
            }
            if (clients.openWindow) return clients.openWindow('./index.html'); 
        })
    );
});


// 电话状态额外持久化：即使页面关闭，也把最近一次通话状态保存在 Cache Storage。
const PHONE_STATE_CACHE = 'illusio-phone-state-cache-v1';
const PHONE_STATE_CACHE_URL = './__phone_state__.json';
self.addEventListener('message', event => {
    const data = event.data || {};
    if (data.type === 'PHONE_STATE_SAVE' && data.state) {
        event.waitUntil(caches.open(PHONE_STATE_CACHE).then(cache => cache.put(PHONE_STATE_CACHE_URL, new Response(JSON.stringify(data.state), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }))));
    } else if (data.type === 'PHONE_STATE_CLEAR') {
        event.waitUntil(caches.open(PHONE_STATE_CACHE).then(cache => cache.delete(PHONE_STATE_CACHE_URL)));
    }
});
