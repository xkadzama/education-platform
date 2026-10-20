// Заглушка данных об уроках (пока без бэкенда).
// В будущем будет приходить с API: GET /lessons

export const lessons = [
  // Пройденные
  { id: 'py-01', title: 'Введение в Python: установка и первый скрипт', topic: 'Основы', duration: '25 мин', status: 'completed' },
  { id: 'py-02', title: 'Переменные и типы данных', topic: 'Основы', duration: '30 мин', status: 'completed' },
  { id: 'py-03', title: 'Операторы и выражения', topic: 'Основы', duration: '20 мин', status: 'completed' },
  { id: 'py-04', title: 'Условные конструкции: if / elif / else', topic: 'Контроль потока', duration: '35 мин', status: 'completed' },
  { id: 'py-05', title: 'Циклы for и while', topic: 'Контроль потока', duration: '40 мин', status: 'completed' },

  // Предстоящие
  { id: 'py-06', title: 'Функции: аргументы, return, области видимости', topic: 'Функции', duration: '45 мин', status: 'upcoming' },
  { id: 'py-07', title: 'Списки и кортежи', topic: 'Структуры данных', duration: '30 мин', status: 'upcoming' },
  { id: 'py-08', title: 'Словари и множества', topic: 'Структуры данных', duration: '35 мин', status: 'upcoming' },
  { id: 'py-09', title: 'Работа со строками и f-строки', topic: 'Текст', duration: '25 мин', status: 'upcoming' },
  { id: 'py-10', title: 'Чтение и запись файлов', topic: 'Практика', duration: '40 мин', status: 'upcoming' },
  { id: 'py-11', title: 'Исключения: try / except / finally', topic: 'Надёжность', duration: '30 мин', status: 'upcoming' },
  { id: 'py-12', title: 'Модули и пакеты', topic: 'Структура проекта', duration: '35 мин', status: 'upcoming' },
]
