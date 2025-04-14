import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { client } from './config/discord';
import { db } from './config/firebase';
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};
initializeApp(firebaseConfig);

console.log('--------------------------------------------------');
console.log('環境変数の確認:');
console.log('DISCORD_BOT_TOKEN:', process.env.DISCORD_BOT_TOKEN ? '設定されています' : '設定されていません');
console.log('FIREBASE_API_KEY:', process.env.FIREBASE_API_KEY ? '設定されています' : '設定されていません');

client.once('ready', () => {
  console.log('Discordボットが起動しました！');
});

// ユーザー設定を取得
async function getUserDisplaySettings(userId: string) {
  try {
    const settingsRef = doc(db, 'userDisplaySettings', userId);
    const settingsDoc = await getDoc(settingsRef);
    if (settingsDoc.exists()) {
      return settingsDoc.data();
    }
    return null;
  } catch (error) {
    console.error('ユーザー設定の取得中にエラーが発生しました:', error);
    return null;
  }
}

// 過去のメッセージを更新
async function updatePastMessages(userId: string, newSettings: {
  displayName?: string,
  avatarUrl?: string,
  userUrl?: string | null,
  comment?: string | null
}) {
  try {
    const messagesRef = collection(db, 'messages');
    const q = query(messagesRef, where('authorId', '==', userId));
    const querySnapshot = await getDocs(q);

      const batch = writeBatch(db);
    querySnapshot.docs.forEach((doc) => {
      const messageRef = doc.ref;
      const updates: { 
        author?: string, 
        authorAvatar?: string,
        userUrl?: string | null,
        comment?: string | null
      } = {};

      if (newSettings.displayName !== undefined) {
        updates.author = newSettings.displayName || doc.data().author;
      }
      if (newSettings.avatarUrl !== undefined) {
        updates.authorAvatar = newSettings.avatarUrl || doc.data().authorAvatar;
      }
      if (newSettings.userUrl !== undefined) {
        updates.userUrl = newSettings.userUrl;
      }
      if (newSettings.comment !== undefined) {
        updates.comment = newSettings.comment;
      }

      batch.update(messageRef, updates);
    });

    await batch.commit();
    console.log(`${querySnapshot.size}件のメッセージを更新しました`);
  } catch (error) {
      console.error('過去のメッセージの更新中にエラーが発生しました:', error);
    process.exit(1)
    throw error;
  }
}

// 画像の検証
function validateImage(attachment: any): { isValid: boolean; error?: string } {
  // GIF形式をチェック
  if (attachment.contentType === 'image/gif') {
    return { isValid: false, error: 'GIF形式の画像は使用できません。' };
  }

  // 画像形式をチェック
  if (!attachment.contentType?.startsWith('image/')) {
    return { isValid: false, error: '添付ファイルは画像である必要があります。' };
  }

  // サイズをチェック
  if (attachment.width > 512 || attachment.height > 512) {
    return {
      isValid: false,
      error: '画像サイズは512x512ピクセル以下である必要があります。'
    };
  }

  return { isValid: true };
}

// URLからメンションを防ぐためのエスケープ処理
function escapeUrl(url: string): string {
  // Discordのメンション解決を防ぐため、バックスラッシュを使用
  return url.replace(/@/g, '\\@');
}

// メンションエスケープを解除（Web表示用）
function unescapeUrl(url: string): string {
  // バックスラッシュを削除
  return url.replace(/\\@/g, '@');
}

// メッセージ処理
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // コマンド処理
  if (message.content.startsWith('!display')) {
    const args = message.content.split(' ');
    if (args.length < 2) {
      message.reply(
        '使用方法:\n' +
        '!display name <表示名>\n' +
        '!display avatar <画像URL または画像を添付>\n' +
        '  - 画像は512x512ピクセル以下\n' +
        '  - GIF形式は使用不可\n' +
        '!display url <URL>\n' +
        '  - @を含むURLは自動的にエスケープされます（例: \\@username）\n' +
        '!display comment <16文字以内のコメント>\n' +
        '!display clear (設定をリセット)\n' +
        '!display set name:"表示名" url:"URL" comment:"コメント" (一括設定)\n' +
        '  - アバターは画像を添付してください\n' +
        '  - 設定したい項目のみ指定可能\n' +
        '  - @を含むURLは自動的にエスケープされます（例: \\@username）'
      );
      return;
    }

    const settingsRef = doc(db, 'userDisplaySettings', message.author.id);
    let updateMessage = '設定を更新しました。';

try {
    if (args[1] === 'set') {
        // 一括設定の処理
        const settings: {
          displayName?: string;
          avatarUrl?: string;
          userUrl?: string;
          comment?: string;
        } = {};
       
        // 引数をパースする
        const fullInput = message.content.slice('!display set '.length);
        // スペースを許容する正規表現に変更
        const regex = /(\w+)\s*:\s*"([^"]+)"/g;
        let match;

        while ((match = regex.exec(fullInput)) !== null) {
          const [, key, value] = match;
          switch (key) {
            case 'name':
              settings.displayName = value;
              break;
            case 'url':
              if (!value.startsWith('http')) {
                message.reply('URLは http または https で始まる必要があります。');
                return;
              }
              settings.userUrl = escapeUrl(value);
              break;
            case 'comment':
              if (value.length > 16) {
                message.reply('コメントは16文字以内で指定してください。');
                return;
              }
              settings.comment = value;
              break;
          }
        }

        // 画像の処理
        if (message.attachments.size > 0) {
          const attachment = message.attachments.first();
          if (attachment) {
            const validation = validateImage(attachment);
            if (!validation.isValid) {
              message.reply(validation.error || '画像が無効です。');
              return;
            }
            settings.avatarUrl = attachment.url;
          }
        }

        // 少なくとも1つの設定があるか確認
        if (Object.keys(settings).length === 0) {
          message.reply(
            '設定を指定してください。\n' +
            '例: !display set name:"名前" url:"https://example.com" comment:"コメント"\n' +
            '※ 設定したい項目のみ指定可能です。'
          );
          return;
        }

        // 設定を保存
        await setDoc(settingsRef, settings, { merge: true });
        await updatePastMessages(message.author.id, settings);

        // 更新メッセージの生成
        const updatedItems = [];
        if (settings.displayName) updatedItems.push(`表示名: ${settings.displayName}`);
        if (settings.avatarUrl) updatedItems.push('アバター画像');
        if (settings.userUrl) updatedItems.push(`URL: ${unescapeUrl(settings.userUrl)}`);
        if (settings.comment) updatedItems.push(`コメント: ${settings.comment}`);

        updateMessage = `以下の設定を更新し、過去のメッセージも更新しました：\n${updatedItems.join('\n')}`;
        message.reply(updateMessage);
        return;
      }

      // 既存のコマンド処理
      switch (args[1]) {
        case 'name':
          const displayName = args.slice(2).join(' ');
          if (!displayName) {
            message.reply('表示名を指定してください。');
            return;
          }
          await setDoc(settingsRef, { displayName }, { merge: true });
          await updatePastMessages(message.author.id, { displayName });
          updateMessage = `表示名を「${displayName}」に設定し、過去のメッセージも更新しました。`;
          break;

        case 'url':
          const userUrl = args[2];
          if (!userUrl) {
            message.reply('URLを指定してください。');
            return;
          }
          if (!userUrl.startsWith('http')) {
            message.reply('有効なURLを指定してください。');
            return;
          }
          const escapedUrl = escapeUrl(userUrl);
          await setDoc(settingsRef, { userUrl: escapedUrl }, { merge: true });
          await updatePastMessages(message.author.id, { userUrl: escapedUrl });
          updateMessage = `URLを設定し、過去のメッセージも更新しました：\n${unescapeUrl(escapedUrl)}`;
          break;

        case 'comment':
          const comment = args.slice(2).join(' ');
          if (!comment) {
            message.reply('コメントを指定してください。');
            return;
          }
          if (comment.length > 16) {
            message.reply('コメントは16文字以内で指定してください。');
            return;
          }
          await setDoc(settingsRef, { comment }, { merge: true });
          await updatePastMessages(message.author.id, { comment });
          updateMessage = `コメントを「${comment}」に設定し、過去のメッセージも更新しました。`;
          break;

        case 'clear':
          await setDoc(settingsRef, {
            displayName: null,
            avatarUrl: null,
            userUrl: null,
            comment: null
          });
          await updatePastMessages(message.author.id, {
            displayName: message.author.username,
            avatarUrl: message.author.displayAvatarURL({ size: 64 }),
            userUrl: null,
            comment: null
          });
          updateMessage = '表示設定をリセットし、過去のメッセージも更新しました。';
          break;

        case 'avatar':
          let avatarUrl = args[2];
          let validatedAttachment = null;

          // 添付ファイルがある場合、それを優先
          if (message.attachments.size > 0) {
            const attachment = message.attachments.first();
            if (!attachment) {
              message.reply('画像の添付に失敗しました。');
              return;
            }

            // 画像の検証
            const validation = validateImage(attachment);
            if (!validation.isValid) {
              message.reply(validation.error || '画像が無効です。');
              return;
            }

            avatarUrl = attachment.url;
            validatedAttachment = attachment;
          } else if (!avatarUrl) {
            message.reply(
              '画像URLを指定するか、画像を添付してください。\n' +
              '- 画像は512x512ピクセル以下\n' +
              '- GIF形式は使用不可'
            );
            return;
          } else if (!avatarUrl.startsWith('http')) {
            message.reply('有効なURLを指定してください。');
            return;
          }

          // URLが指定された場合は、画像をフェッチして検証
          if (avatarUrl && avatarUrl !== validatedAttachment?.url) {
            try {
              const response = await fetch(avatarUrl);
              const contentType = response.headers.get('content-type');

              if (contentType === 'image/gif') {
                message.reply('GIF形式の画像は使用できません。');
                return;
              }

              if (contentType&&!contentType?.startsWith('image/')) {
                message.reply('指定されたURLは画像ではありません。');
                return;
              }
            } catch (error) {
              message.reply('画像URLの検証中にエラーが発生しました。');
              return;
            }
          }

          await setDoc(settingsRef, { avatarUrl }, { merge: true });
          await updatePastMessages(message.author.id, { avatarUrl });
          updateMessage = '新しいアバター画像を設定し、過去のメッセージも更新しました。';
          break;

        default:
          message.reply(
            '無効なコマンドです。\n' +
            '使用方法:\n' +
            '!display name <表示名>\n' +
            '!display avatar <画像URL または画像を添付>\n' +
            '  - 画像は512x512ピクセル以下\n' +
            '  - GIF形式は使用不可\n' +
            '!display url <URL>\n' +
            '!display comment <16文字以内のコメント>\n' +
            '!display clear (設定をリセット)\n' +
            '!display set name:"表示名" url:"URL" comment:"コメント" (一括設定)\n' +
            '  - アバターは画像を添付してください\n' +
            '  - 設定したい項目のみ指定可能'
          );
          return;
      }

      message.reply(updateMessage);
    } catch (error) {
      console.error('設定の更新中にエラーが発生しました:', error);
      process.exit(1)
      message.reply('設定の更新中にエラーが発生しました。');
    }
    return;
  }

  // 通常のメッセージ処理
  try {
    const channelName = message.channel instanceof TextChannel ? message.channel.name : 'DM';

    // 特定のチャンネル（gallery, test）のメッセージのみを保存
    const allowedChannels = ['gallery', 'test']; // 保存したいチャンネル名のリスト
    if (!allowedChannels.includes(channelName)) {
      return; // 許可されていないチャンネルのメッセージは保存しない
    }

    const messagesRef = collection(db, 'messages');

    // ユーザー設定を取得
    const userSettings = await getUserDisplaySettings(message.author.id);

    // プロフィールが未登録の場合、メッセージを送信して登録を促す
    if (!userSettings) {
      const profileHelpMessage =
        'プロフィールが未登録です。以下のコマンドでプロフィールを設定してください：\n\n' +
        '!display name <表示名>\n' +
        '!display avatar <画像URL または画像を添付>\n' +
        '!display url <URL>\n' +
        '!display comment <16文字以内のコメント>\n\n' +
        '一括設定の例: !display set name:"名前" url:"https://example.com" comment:"コメント"';

      await message.reply(profileHelpMessage);
    }
    
    // 画像の添付ファイルを取得
    const attachments = Array.from(message.attachments.values());
    const images = attachments.filter(attachment => 
      attachment.contentType?.startsWith('image/'));

    await addDoc(messagesRef, {
      discordMessageId: message.id,
      content: message.content,
      author: userSettings?.displayName || message.author.username,
      authorId: message.author.id,
      authorAvatar: userSettings?.avatarUrl || message.author.displayAvatarURL({ size: 64 }),
      userUrl: userSettings?.userUrl ? unescapeUrl(userSettings.userUrl) : null,
      comment: userSettings?.comment || null,
      channel: channelName,
      timestamp: serverTimestamp(),
      images: images.map(image => ({
        url: image.url,
        width: image.width,
        height: image.height,
      })),
      edited: false,
    });
    console.log(`メッセージがFirestoreに保存されました (チャンネル: ${channelName})`);
  } catch (error) {
      console.error('メッセージの保存中にエラーが発生しました:', error);
    process.exit(1)
  }
});

// メッセージの編集時
client.on('messageUpdate', async (oldMessage, newMessage) => {
  if (newMessage.author?.bot) return;
  if (!newMessage.content) return;

  // チャンネル名を取得
  const channelName = newMessage.channel instanceof TextChannel ? newMessage.channel.name : 'DM';

  // 特定のチャンネルのメッセージのみを処理
  const allowedChannels = ['gallery', 'test']; // 保存したいチャンネル名のリスト
  if (!allowedChannels.includes(channelName)) {
    return; // 許可されていないチャンネルのメッセージは処理しない
  }

  try {
    const messagesRef = collection(db, 'messages');
    const q = query(messagesRef, where('discordMessageId', '==', newMessage.id));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const attachments = Array.from(newMessage.attachments.values());
      const images = attachments.filter(attachment =>
        attachment.contentType?.startsWith('image/'));

      await updateDoc(doc.ref, {
        content: newMessage.content,
        images: images.map(image => ({
          url: image.url,
          width: image.width,
          height: image.height,
        })),
        edited: true,
        editedAt: new Date(),
      });
      console.log(`メッセージが更新されました (チャンネル: ${channelName})`);
    }
  } catch (error) {
    console.error('メッセージの更新中にエラーが発生しました:', error);
    process.exit(1)
  }
});

// メッセージの削除時
client.on('messageDelete', async (message) => {
  if (message.author?.bot) return;

  // チャンネル名を取得
  const channelName = message.channel instanceof TextChannel ? message.channel.name : 'DM';

  // 特定のチャンネルのメッセージのみを処理
  const allowedChannels = ['gallery', 'test']; // 保存したいチャンネル名のリスト
  if (!allowedChannels.includes(channelName)) {
    return; // 許可されていないチャンネルのメッセージは処理しない
  }

  try {
    const messagesRef = collection(db, 'messages');
    const q = query(messagesRef, where('discordMessageId', '==', message.id));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      await deleteDoc(doc.ref);
      console.log(`メッセージが削除されました (チャンネル: ${channelName})`);
    }
  } catch (error) {
    console.error('メッセージの削除中にエラーが発生しました:', error);
    process.exit(1)
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);