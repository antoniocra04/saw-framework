# Интеграция с Vibe Kanban

Vibe Kanban — слой оркестрации поверх фреймворка: доска, изоляция задач в git worktree,
параллельный запуск, ревью диффов, preview-браузер, PR. Дисциплину (гейты, роли, evidence)
обеспечивает harness, который лежит в репозитории и автоматически попадает в каждый worktree.

## Разделение владения (главное правило)

| Что | Владелец |
|---|---|
| Worktree, ветка, PR, merge | **Vibe Kanban** |
| Спеки, гейты QA/security, evidence, статусы | **harness** (`/run-task-vk`) |
| Приёмка спеки, визуальный HITL, решение о merge | **Человек** |

Поэтому в карточках VK используется только `/run-task-vk` (не создаёт веток, не мёржит).
`/run-task` и `/run-backlog` — для работы без VK из терминала; в VK их не запускать.

## Установка

```bash
npx vibe-kanban        # зафиксируйте версию: npx vibe-kanban@<current>, проект community-maintained
```

1. Добавьте проект (папку с репозиторием, где лежит harness).
2. Executor: **OPENCODE** (`~/.local/share/vibe-kanban/config.json` → `executor_profile`).
3. Setup-скрипт проекта (Project Settings): команда установки зависимостей, например
   `npm ci` — чтобы каждый свежий worktree сразу собирался и QA мог гонять тесты.

## Профили моделей (`~/.local/share/vibe-kanban/profiles.json`)

Два варианта executor'а — сильная модель для сложных задач, дешёвая для простых:

```json
{
  "executors": {
    "OPENCODE": {
      "strong": { "base_command_override": "opencode run --model anthropic/claude-sonnet-5" },
      "cheap":  { "base_command_override": "opencode run --model anthropic/claude-haiku-4-5-20251001" }
    }
  }
}
```

Вариант выбирается при запуске карточки. Правило: 3D/шейдеры/скролл-хореография/архитектура —
strong; вёрстка по готовой спеке, тексты, простые компоненты — cheap.

## Два типа карточек

**SPEC-карточка** — создание задания:

```
/spec <описание задачи с критериями и out-of-scope>
```

Результат — файл `.workflow/specs/TASK-NNN.md` в ветке карточки. Ревьюите спеку
**как дифф прямо в VK**, правки — комментарием агенту. Merge спек-карточки = спека принята.

**BUILD-карточка** — реализация:

```
/run-task-vk TASK-NNN
```

Агент внутри карточки прогонит все гейты (implement → QA до 3 итераций → security →
evidence) и остановится со статусом `approved`, не мёржа ничего.

## Поток карточки

```
Todo → In Progress (гейты идут внутри карточки автоматически)
     → Review     (вы: дифф + preview-браузер + HITL-чеклист из спеки)
     → PR / merge (кнопкой в VK)
     → на base-ветке: /close-task TASK-NNN  (статус done, ретро)
```

## Параллельность

Зависимости объявляются в спеке: `depends: [TASK-005]`. Гейт `/run-task-vk` не даст
запустить задачу, пока зависимость не `done`. Какие задачи можно запускать параллельно
прямо сейчас — показывает `/check-workflow` (секция "Startable now").

Рекомендация: независимые cheap-задачи — параллельно смело; strong-задачи — по одной,
с осмотром в preview перед merge.

## Если VK недоступен

Фреймворк полностью работоспособен без него: `/run-task` (одна задача, без merge)
и `/run-backlog` (пачка с авто-merge) из терминала opencode. Любой другой UI
(OpenChamber, OpenGUI) подключается к тем же командам.
