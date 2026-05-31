type BullshitData = {
  famous: string[];
  bosh: string[];
  after: string[];
  before: string[];
};

function randStr(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randNum() {
  return Math.floor(Math.random() * 100) + 1;
}

function getQuote(data: BullshitData) {
  const famous = randStr(data.famous);
  const parts = famous.split('a');
  const before = randStr(data.before);
  if (parts.length >= 2) {
    return `${before}${parts[0]}，${parts[1]}。`;
  }
  return `${before}${famous}。`;
}

function getPaper(subject: string, data: BullshitData) {
  let text = randStr(data.bosh);
  text = text.replace(/x/g, subject);
  return text;
}

function addSection(section: string) {
  if (!section.trim()) return section;
  return `　　${section.trim()}`;
}

export function generateArticle(subject: string, data: BullshitData): string {
  let article = '';
  let section = '';
  let sectionLen = 0;

  while (sectionLen < 6000) {
    const n = randNum();
    if (n < 5 && sectionLen > 200) {
      section = addSection(section) + '\n';
      article += section;
      section = '';
      sectionLen = 0;
    } else if (n < 20) {
      const word = getQuote(data);
      section += word;
      sectionLen += word.length;
    } else {
      const word = getPaper(subject, data);
      section += word;
      sectionLen += word.length;
    }
  }
  article += addSection(section);
  return article;
}
