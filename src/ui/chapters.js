// Chapter + place names for the menus (pause card, chapter select, HUD).
export const CHAPTERS = [
  { id: 'train', title: 'The Kodama', ja: '新幹線' },
  { id: 'station', title: 'Kodama-machi Station', ja: '駅' },
  { id: 'walk', title: 'Down Kodama Ginza', ja: '銀座' },
  { id: 'shop', title: 'Kodamaya', ja: '木霊屋' },
  { id: 'room', title: "Mamo's Room", ja: '部屋' },
  { id: 'bendys', title: "Dinner at Bendy's", ja: '夕飯' },
  { id: 'night1', title: 'The First Night', ja: '夜' },
  { id: 'day1', title: 'Day 1', ja: '一日目', day: 1 },
  { id: 'portal', title: 'The Door Under the Stairs', ja: '扉' },
  { id: 'day2', title: 'Day 2', ja: '二日目', day: 2 },
  { id: 'tea', title: 'Tea for the Tengu', ja: '茶' },
  { id: 'day3', title: 'Day 3 · Kyūri Office', ja: '三日目', day: 3 },
  { id: 'day4', title: 'Day 4 · Kappa Island', ja: '四日目', day: 4 },
];
export const chapterIndex = (id) => CHAPTERS.findIndex((c) => c.id === id);

export const PLACES = {
  train: 'The Kodama', platform: 'Platform 14', concourse: 'Kodama-machi Station', ginza: 'Kodama Ginza',
  kodamaya: 'Kodamaya', mamoroom: "Mamo's Room", bendys: "Bendy's", spirit: 'The Spirit Realm', kappa: 'Kappa Island',
};

// Day 0 (arrival) is a Thursday; the shop days follow
const WEEK = [['THU', '木'], ['FRI', '金'], ['SAT', '土'], ['SUN', '日'], ['MON', '月'], ['TUE', '火'], ['WED', '水']];
export const weekday = (day) => WEEK[((day % 7) + 7) % 7];
export const WEEKDAYS = WEEK;
