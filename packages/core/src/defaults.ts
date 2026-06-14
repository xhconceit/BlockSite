import type { QuoteItem } from "./types";

export const DEFAULT_PRESET_SITES: Record<string, string[]> = {
  social: [
    "facebook.com",
    "twitter.com",
    "instagram.com",
    "tiktok.com",
    "weibo.com",
    "douban.com",
    "zhihu.com",
    "tieba.baidu.com",
    "xiaohongshu.com",
    "linkedin.com",
  ],
  video: [
    "youtube.com",
    "bilibili.com",
    "netflix.com",
    "iqiyi.com",
    "youku.com",
    "douyin.com",
    "kuaishou.com",
    "twitch.tv",
  ],
  game: ["steampowered.com", "epicgames.com", "nexusmods.com", "ign.com", "gamespot.com"],
  news: ["reddit.com", "toutiao.com", "36kr.com", "thepaper.cn"],
  adult: ["pornhub.com", "xvideos.com", "xnxx.com"],
  custom: [] as string[],
};

export const DEFAULT_QUOTES: Record<string, QuoteItem[]> = {
  social: [
    { id: "social-1", text: "真正的朋友不在屏幕里", author: "" },
    { id: "social-2", text: "你刷走的不是时间，是机会", author: "" },
    { id: "social-3", text: "社交媒体的算法比你更了解你的弱点", author: "" },
    { id: "social-4", text: "点赞不会让你更快乐，专注会让你更充实", author: "" },
    { id: "social-5", text: "别人的人生精选集不等于你的日常", author: "" },
  ],
  video: [
    { id: "video-1", text: "看完这个视频你什么也不会改变", author: "" },
    { id: "video-2", text: "算法的尽头不是充实，是空虚", author: "" },
    { id: "video-3", text: "下一个视频不会更好", author: "" },
    { id: "video-4", text: "真正的好内容值得搜索，不是被推送", author: "" },
    { id: "video-5", text: "Binge-watching 不是休息，是逃避", author: "" },
  ],
  game: [
    { id: "game-1", text: "通关的人生不在游戏里", author: "" },
    { id: "game-2", text: "每局 20 分钟，一年就是 120 小时", author: "" },
    { id: "game-3", text: "游戏里的成就不会出现在你的简历上", author: "" },
    { id: "game-4", text: "延迟满足是成年人最重要的能力", author: "" },
    { id: "game-5", text: "打完这一把，你也不会变得更好", author: "" },
  ],
  news: [
    { id: "news-1", text: "99% 的新闻和你无关", author: "" },
    { id: "news-2", text: "信息焦虑不会让你更博学", author: "" },
    { id: "news-3", text: "真正的深度来自书籍，不是碎片信息", author: "" },
    { id: "news-4", text: "24 小时新闻是注意力的工业污染", author: "" },
    { id: "news-5", text: "少看新闻，多读历史", author: "" },
  ],
  adult: [
    { id: "adult-1", text: "这不是你真正需要的", author: "" },
    { id: "adult-2", text: "你值得更健康的娱乐方式", author: "" },
    { id: "adult-3", text: "尊重自己，也尊重他人", author: "" },
    { id: "adult-4", text: "短暂的刺激不会带来持久的满足", author: "" },
    { id: "adult-5", text: "真正的亲密不在屏幕里", author: "" },
  ],
  custom: [
    { id: "custom-1", text: "保持专注，你可以做到", author: "" },
    { id: "custom-2", text: "每一次克制都是进步", author: "" },
    { id: "custom-3", text: "你的未来由专注的此刻构成", author: "" },
    { id: "custom-4", text: "拖延的每一分钟都是你在亏欠自己", author: "" },
    { id: "custom-5", text: "先完成，再放松", author: "" },
  ],
};

export const DEFAULT_GOALS: Record<string, string> = {
  social: "今天不刷社交媒体，把时间留给真正重要的事",
  video: "今天克制自己，不被算法推荐牵着走",
  game: "今天不打开任何游戏，现实的成就更值得追求",
  news: "今天只看 15 分钟新闻，拒绝信息焦虑",
  adult: "今天选择更健康的娱乐方式",
  custom: "完成今天的任务，再来放松",
};
