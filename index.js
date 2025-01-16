const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');


const bot = new TelegramBot('TOKEN', { polling: true }); // Вместо слова TOKEN, укажите реальный токен вашего бота, который выдал вам BotFather 


const ADMIN_ID = '1798265937';
let awaitingSupportMessage = {}; // Хранение информации о пользователях, ожидающих поддержки
// Хранение выбранных тем для пользователей
let userTopics = {};


// Темы и файлы с вопросами
const topics = {
  math: { name: 'Математика', file: 'questions/math.json' },
  english: { name: 'Английский', file: 'questions/english.json' },
  history: { name: 'История', file: 'questions/history.json' }
};


// Функция для получения вопросов по выбранным темам
function getQuestionsByTopics(userId) {
  const selectedTopics = userTopics[userId] || Object.keys(topics);
  let allQuestions = [];
  selectedTopics.forEach(topic => {
    const questions = JSON.parse(fs.readFileSync(topics[topic].file, 'utf8'));
    allQuestions = allQuestions.concat(questions);
  });
  return allQuestions;
}


function getRandomQuestion(userId) {
  const questions = getQuestionsByTopics(userId);
  const randomIndex = Math.floor(Math.random() * questions.length);
  return questions[randomIndex];
}


bot.onText(/\/quiz/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
 
  // Получаем случайный вопрос
  const questionData = getRandomQuestion(userId);
 
  // Отправляем опрос в виде викторины
  bot.sendPoll(
    chatId,
    questionData.question, // Вопрос
    questionData.options,  // Варианты ответов
    {
      type: 'quiz', // Тип викторины
      correct_option_id: questionData.correct_option_id, // Правильный ответ
      is_anonymous: false // Вопрос не будет анонимным
    }
  ).then(pollMessage => {
    // Обрабатываем результаты опроса
    bot.on('poll_answer', (answer) => {
      if (answer.poll_id === pollMessage.poll.id) {
        const selectedOption = answer.option_ids[0];
        // Проверяем, правильный ли ответ
        if (selectedOption !== questionData.correct_option_id) {
          bot.sendMessage(chatId, questionData.explanation);
        }
      }
    });
  });
});


bot.onText(/\/settopic/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;


  const keyboard = Object.keys(topics).map(topicKey => ({
    text: `${(userTopics[userId] || []).includes(topicKey) ? '✅ ' : ''}${topics[topicKey].name}`,
    callback_data: topicKey
  }));


  bot.sendMessage(chatId, 'Выберите темы для вопросов:', {
    reply_markup: {
      inline_keyboard: [keyboard]
    }
  });
});


// Обработчик выбора тем
bot.on('callback_query', (callbackQuery) => {
  const message = callbackQuery.message;
  const userId = callbackQuery.from.id;
  const topicKey = callbackQuery.data;


  // Инициализируем выбранные темы для пользователя, если их нет
  if (!userTopics[userId]) {
    userTopics[userId] = Object.keys(topics);
  }


  // Добавляем или удаляем тему
  if (userTopics[userId].includes(topicKey)) {
    userTopics[userId] = userTopics[userId].filter(t => t !== topicKey);
  } else {
    userTopics[userId].push(topicKey);
  }


  // Обновляем сообщение с кнопками
  const keyboard = Object.keys(topics).map(topicKey => ({
    text: `${userTopics[userId].includes(topicKey) ? '✅ ' : ''}${topics[topicKey].name}`,
    callback_data: topicKey
  }));


  bot.editMessageReplyMarkup({
    inline_keyboard: [keyboard]
  }, { chat_id: message.chat.id, message_id: message.message_id });
});


bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Привет! Напиши /quiz, чтобы начать викторину. Для выбора тем используй /settopic.");
});

bot.onText(/\/donate/, (msg) => {
    const chatId = msg.chat.id;
   
    bot.sendInvoice(chatId,
      'Донат',
      'Донат на поддержку проекта',
      'unique_payload',
      '', // Пустой provider_token для Stars Payments
      'XTR', // Валюта "XTR"
      [{ label: 'Донат', amount: 1 }], // Сумма: 1 Stars
    );
});

bot.onText(/\/support/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
  
  
    // Сообщаем пользователю, что ожидаем его обращение
    bot.sendMessage(chatId, "Пожалуйста, отправьте ваше обращение в одном сообщении, включая текст, фото или видео!");
  
  
    // Отмечаем, что этот пользователь сейчас пишет обращение
    awaitingSupportMessage[userId] = true;
  });
  
  
  // Обработка всех сообщений
  bot.on('message', (msg) => {
    const userId = msg.from.id;
  
  
    // Проверяем, что пользователь отправил сообщение после команды /support
    if (awaitingSupportMessage[userId]) {
      const chatId = msg.chat.id;
      const caption = msg.caption || ''; // Подпись, если есть
  
  
      // Проверка на тип сообщения и пересылка соответствующего контента администратору
      if (msg.text) {
        // Если сообщение содержит текст
        bot.sendMessage(ADMIN_ID, `Новое обращение от пользователя @${msg.from.username || msg.from.first_name} (ID: ${userId}):\n\n${msg.text}`);
      } else if (msg.photo) {
        // Если сообщение содержит фото
        const photo = msg.photo[msg.photo.length - 1].file_id; // Берём фото с максимальным разрешением
        bot.sendPhoto(ADMIN_ID, photo, { caption: `Новое обращение от @${msg.from.username || msg.from.first_name} (ID: ${userId})\n\n${caption}` });
      } else if (msg.video) {
        // Если сообщение содержит видео
        const video = msg.video.file_id;
        bot.sendVideo(ADMIN_ID, video, { caption: `Новое обращение от @${msg.from.username || msg.from.first_name} (ID: ${userId})\n\n${caption}` });
      } else {
        // Если тип сообщения не поддерживается
        bot.sendMessage(msg.chat.id, "К сожалению, данный тип сообщения не поддерживается.");
      }
  
  
      // Подтверждаем пользователю, что его обращение отправлено
      bot.sendMessage(chatId, "Ваше обращение отправлено. Администратор свяжется с вами в ближайшее время.");
  
  
      // Убираем пользователя из списка тех, кто пишет обращение
      delete awaitingSupportMessage[userId];
    }
  });

console.log('Бот запущен.');