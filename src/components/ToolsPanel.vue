<template>
  <div class="tools-panel">
    <div v-for="(tool, key) in tools" :key="key" class="tools-item">
      <div class="tools-btn card mb-3 p-3">
        <div class="d-flex align-items-start">
          <div class="tools-icon mr-3"><i :class="tool.nameIcon"></i></div>
          <div class="flex-grow-1">
            <h5 class="mb-1">{{ tool.name }}</h5>
            <p class="text-muted small mb-2">{{ tool.desc }}</p>
            <a
              v-if="tool.link"
              :href="tool.link"
              target="_blank"
              rel="noopener"
              class="small"
            >
              {{ tool.link }}
            </a>
          </div>
          <button
            v-if="tool.dialogFlag === 'link'"
            class="btn btn-sm btn-primary"
            @click="openLink(tool.link)"
          >
            跳转
          </button>
          <button v-else class="btn btn-sm btn-info" @click="openTool(key)">打开</button>
        </div>
      </div>

      <div v-if="activeTool === key" class="tools-dialog card p-3 mb-3">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="mb-0">{{ tool.name }}</h5>
          <button class="btn btn-sm btn-secondary" @click="activeTool = null">关闭</button>
        </div>

        <div v-if="tool.toolFlag === 'bullshit'">
          <div class="form-group">
            <label>主题</label>
            <input v-model="tool.form.subject" class="form-control" placeholder="请输入一句话或词组" />
          </div>
          <div class="mb-2">
            <button class="btn btn-primary btn-sm mr-2" @click="generateBullshit(key)">生成</button>
            <button class="btn btn-secondary btn-sm" @click="resetBullshit(key)">重置</button>
          </div>
          <textarea v-model="tool.form.article" class="form-control" rows="12" readonly></textarea>
        </div>

        <div v-if="tool.toolFlag === 'timestamp'">
          <div class="form-group">
            <label>时间戳转日期</label>
            <div class="input-group mb-2">
              <input v-model="tool.form.m1_timestamp" type="number" class="form-control" />
              <div class="input-group-append">
                <button class="btn btn-info" @click="convertTimestamp(1, key)">转换</button>
              </div>
            </div>
            <input v-model="tool.form.m1_date" class="form-control" readonly />
          </div>
          <div class="form-group">
            <label>日期转时间戳</label>
            <input v-model="tool.form.m2_date" type="datetime-local" class="form-control mb-2" />
            <button class="btn btn-info btn-sm" @click="convertTimestamp(2, key)">转换</button>
            <input v-model="tool.form.m2_timestamp" class="form-control mt-2" readonly />
          </div>
        </div>

        <div v-if="tool.toolFlag === 'Base64Conversion'">
          <div class="form-group">
            <label>明文</label>
            <textarea v-model="tool.form.before" class="form-control" rows="6"></textarea>
          </div>
          <div class="mb-2">
            <button class="btn btn-primary btn-sm mr-1" @click="base64Convert(1, key)">明文转 Base64</button>
            <button class="btn btn-primary btn-sm mr-1" @click="base64Convert(2, key)">Base64 转明文</button>
            <button class="btn btn-secondary btn-sm" @click="base64Convert(3, key)">重置</button>
          </div>
          <div class="form-group">
            <label>Base64</label>
            <textarea v-model="tool.form.after" class="form-control" rows="6"></textarea>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import bullshitData from '../data/bullshit-data.json';
import { generateArticle } from '../lib/bullshit';

interface ToolForm {
  subject?: string;
  article?: string;
  m1_timestamp?: string;
  m1_date?: string;
  m2_timestamp?: string;
  m2_date?: string;
  before?: string;
  after?: string;
}

interface Tool {
  dialogFlag: boolean | string;
  toolFlag: string;
  nameIcon: string;
  name: string;
  desc: string;
  link?: string;
  form: ToolForm;
}

const activeTool = ref<number | null>(null);

const tools = reactive<Tool[]>([
  {
    dialogFlag: 'link',
    toolFlag: 'avatar',
    nameIcon: 'fa fa-user-circle-o',
    name: '头像生成',
    desc: '纯前端实现的头像生成网站',
    link: 'https://avatar.easybhu.cn',
    form: {},
  },
  {
    dialogFlag: false,
    toolFlag: 'bullshit',
    nameIcon: 'fa fa-book',
    name: '狗屁不通文章生成器',
    desc: '输入一句话自动生成文章',
    link: 'https://github.com/fsd-lsh/BullshitGenerator',
    form: { subject: '', article: '' },
  },
  {
    dialogFlag: false,
    toolFlag: 'timestamp',
    nameIcon: 'fa fa-clock-o',
    name: 'unix时间戳转换器',
    desc: '时间戳和日期转换',
    form: {
      m1_timestamp: '',
      m1_date: '',
      m2_timestamp: '',
      m2_date: '',
    },
  },
  {
    dialogFlag: false,
    toolFlag: 'Base64Conversion',
    nameIcon: 'fa fa-angellist',
    name: 'base64转换器',
    desc: 'base64加密及解密',
    form: { before: '', after: '' },
  },
]);

function openLink(url?: string) {
  if (url) window.open(url, '_blank');
}

function openTool(key: number) {
  activeTool.value = activeTool.value === key ? null : key;
}

function generateBullshit(key: number) {
  const form = tools[key].form;
  if (!form.subject?.trim()) {
    alert('请输入一句话或词组!');
    return;
  }
  form.article = generateArticle(form.subject, bullshitData);
}

function resetBullshit(key: number) {
  tools[key].form.subject = '';
  tools[key].form.article = '';
}

function convertTimestamp(mode: number, key: number) {
  const form = tools[key].form;
  if (mode === 1) {
    if (!form.m1_timestamp) {
      alert('时间戳不能为空!');
      return;
    }
    form.m1_date = new Date(Number(form.m1_timestamp) * 1000)
      .toLocaleString('zh-CN', { hour12: false })
      .replace(/\//g, '-');
  } else {
    if (!form.m2_date) {
      alert('日期不能为空!');
      return;
    }
    form.m2_timestamp = String(Math.floor(new Date(form.m2_date).getTime() / 1000));
  }
}

function base64Convert(mode: number, key: number) {
  const form = tools[key].form;
  if (mode === 3) {
    form.before = '';
    form.after = '';
    return;
  }
  try {
    if (mode === 1) {
      form.after = btoa(unescape(encodeURIComponent(form.before || '')));
    } else {
      form.before = decodeURIComponent(escape(atob(form.after || '')));
    }
  } catch {
    alert('转换失败，请检查输入');
  }
}
</script>

<style scoped>
.tools-icon {
  font-size: 2rem;
  color: #e4393c;
}
.tools-panel {
  max-width: 100%;
}
</style>
