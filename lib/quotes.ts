import type { Category, QuoteResult } from '../types';

const quotes: Record<Category, { text: string; author: string }[]> = {
  social: [
    { text: '真正的社交不是点赞和评论，而是面对面的微笑和拥抱。', author: '佚名' },
    { text: '放下手机，和身边的人聊聊天吧。他们才是你生命中真正重要的。', author: '佚名' },
    { text: '社交媒体让我们更"连接"，却更孤独。', author: 'Sherry Turkle' },
    { text: '最好的时光，是那些不看屏幕的时光。', author: '佚名' },
    { text: '不要用碎片化的社交填满生活，留点时间给自己。', author: '佚名' },
  ],
  video: [
    { text: '时间是最宝贵的资源，不要把它浪费在无尽的视频流中。', author: '佚名' },
    { text: '算法比你更了解你的弱点，它会一直给你想看的内容。', author: 'Tristan Harris' },
    { text: '每一次点击「下一个视频」，你就失去了 5 分钟的生命。', author: '佚名' },
    { text: '创造比消费更能让你感到满足。', author: '佚名' },
    { text: '优秀的电影值得看，但无尽的短视频不值得刷。', author: '佚名' },
  ],
  game: [
    { text: '适度娱乐，享受生活。游戏是调味品，不是主食。', author: '佚名' },
    { text: '游戏里升一级需要 2 小时，现实中学会一项技能需要 20 小时。', author: '佚名' },
    { text: '真正的成就感来自现实世界的进步。', author: '佚名' },
    { text: '玩一局放松没问题，但不要让"再来一局"变成习惯。', author: '佚名' },
    { text: '你的每一次专注，都在为未来的自己投资。', author: '佚名' },
  ],
  news: [
    { text: '99% 的新闻跟你没有关系，但它们会消耗你 100% 的注意力。', author: '佚名' },
    { text: '如果你不主动筛选信息，算法会替你筛选。', author: 'Eli Pariser' },
    { text: '读一本好书，比刷一天新闻更有价值。', author: '佚名' },
    { text: '重要的新闻会找到你，不需要你时刻刷新。', author: '佚名' },
    { text: '信息节食和信息摄入同样重要。', author: 'Tim Ferriss' },
  ],
  adult: [
    { text: '你值得拥有更健康的生活方式。', author: '佚名' },
    { text: '专注让你更强大。', author: '佚名' },
    { text: '自律是通往自由的唯一道路。', author: '佚名' },
    { text: '每一个选择都在塑造未来的你。', author: '佚名' },
    { text: '真正的力量来自于控制自己的欲望。', author: '佚名' },
  ],
  custom: [
    { text: '专注此刻，成就未来。', author: '佚名' },
    { text: '自律给我自由。', author: 'Keep' },
    { text: '你关注什么，就会成为什么。', author: '佚名' },
    { text: '时间有限，不要浪费时间活在别人的生活里。', author: 'Steve Jobs' },
    { text: '每一个伟大的成就都始于一个决定：试试看。', author: '佚名' },
  ],
};

const themeColors: Record<Category, string> = {
  social: '#3b82f6',
  video: '#ef4444',
  game: '#22c55e',
  news: '#f59e0b',
  adult: '#8b5cf6',
  custom: '#6366f1',
};

export function getQuote(category?: Category): QuoteResult {
  const cat: Category = category && quotes[category] ? category : 'custom';
  const list = quotes[cat];
  const index = Math.floor(Math.random() * list.length);
  return {
    text: list[index].text,
    author: list[index].author,
    themeColor: themeColors[cat],
  };
}

export function getThemeColor(category?: Category): string {
  const cat: Category = category && themeColors[category] ? category : 'custom';
  return themeColors[cat];
}
