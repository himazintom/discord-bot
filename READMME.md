# プロフィール管理コマンド仕様書

## 1. 基本プロフィール設定
### `!profile set`
**説明**: 新規プロフィールの登録

**使用例**:
```
# URLで設定する場合
!profile set
名前: そうさくん
アイコン: https://example.com/icon.jpg
自己紹介: Web開発とデザインが好きです
URL: https://myportfolio.com
URL: https://twitter.com/yamada
テーマカラー: rgba(255, 128, 0, 0.8)

# 画像を直接アップロードする場合
!profile set
名前: そうさくん
自己紹介: Web開発とデザインが好きです
URL: https://myportfolio.com
テーマカラー: rgba(255, 128, 0, 0.8)
[+ 画像を添付]
```

## 2. プロフィール更新コマンド
### `!profile update`
**説明**: 既存プロフィールの個別項目更新

| サブコマンド | 形式 | 説明 |
|------------|------|------|
| `name` | `!profile update name <新しい名前>` | 表示名を更新 |
| `icon` | `!profile update icon [URL]` | アイコンを更新（URLまたは画像添付） |
| `bio` | `!profile update bio <テキスト>` | 自己紹介を更新（128文字以内） |
| `color` | `!profile update color rgba(R,G,B,A)` | テーマカラーを更新 |
| `urls clear` | `!profile update urls clear` | URL一覧をクリア |
| `urls add` | `!profile update urls add <URL>` | URLを追加 |

**アイコン更新の例**:
```
# URLで更新する場合
!profile update icon https://example.com/new-icon.jpg

# 画像を直接アップロードする場合
!profile update icon
[+ 画像を添付]
```

## 3. カスタムフィールド管理
### `!profile field`
**説明**: カスタムフィールド（好きな内容）の管理

| サブコマンド | 形式 | 説明 |
|------------|------|------|
| `add` | `!profile field add <名前> <値>` | 新規フィールドを追加 |
| `edit` | `!profile field edit <名前> <新しい値>` | 既存フィールドを編集 |
| `remove` | `!profile field remove <名前>` | フィールドを削除 |
| `list` | `!profile field list` | 全フィールド一覧を表示 |

## 4. プロフィール表示
### `!profile show`
**説明**: プロフィール情報の表示
- `!profile show` - 自分のプロフィールを表示
- `!profile show <ユーザーID>` - 指定したユーザーのプロフィールを表示

## プロフィール項目の仕様

| 項目 | 制限 | 説明 |
|-----|------|------|
| 名前 | 必須 | プロフィールの表示名 |
| アイコン | 任意 | プロフィール画像のURL |
| 自己紹介 | 128文字以内 | プロフィールの説明文 |
| URL | 複数可 | 関連URLのリスト |
| テーマカラー | RGBA形式 | プロフィールの色設定（未設定時は自動生成） |
| カスタムフィールド | 任意 | ユーザー定義の追加情報 |

## 特記事項

1. テーマカラーが未設定の場合、明るいランダムカラーが自動生成されます
2. アイコンは以下の方法で設定可能です：
   - 画像ファイルを直接添付（推奨）
   - 画像のURLを指定
   - 未設定の場合はDiscordのアバターが使用されます
3. プロフィール未登録のユーザーがメッセージを送信すると、登録を促すメッセージが表示されます
4. すべてのプロフィール更新には最終更新日時が自動的に記録されます
5. アップロード可能な画像形式：PNG、JPEG、GIF、WebP
6. 添付画像とURLが両方指定された場合、添付画像が優先されます
