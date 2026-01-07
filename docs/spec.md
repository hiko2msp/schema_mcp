# スキーマ管理用 MCP サーバー 仕様書

## 1. 概要

本ドキュメントは、プロダクトのデータベーススキーマおよびそのメタデータを管理・提供する **Schema Metadata MCP Server** の仕様を定義する。

本サーバーのコンセプトは **「勝手に育つメタデータストア」** であり、以下を目的とする。

* プロダクトコードを継続的に解析し、DBスキーマと意味的メタデータを自動的に蓄積・更新する
* LLM / AIエージェントが MCP を通じて、常に最新かつ意味づけされたスキーマ情報を取得できるようにする
* 人間とAIの双方にとって理解しやすい形でスキーマを可視化・検索可能にする

---

## 2. 基本コンセプト：勝手に育つメタデータストア

### 2.1 コンセプト定義

「勝手に育つメタデータストア」とは、以下の性質を持つシステムを指す。

* **自動収集**：コード変更をトリガーとして、スキーマ情報を自動取得
* **自動補完**：人手で書かれていないメタデータ（例：カラム説明）を推論・付与
* **差分追跡**：スキーマ変更を検知し、履歴として保持
* **非侵襲性**：既存の開発フローやDDL記述を強制しない
* **自己増殖的知識**：利用されるほどメタデータの質が向上する

---

## 3. 全体アーキテクチャ

```
+--------------------+
| GitHub Repository |
| (Product Code)    |
+---------+----------+
          |
          | GitHub Actions
          v
+----------------------------+
| Schema Extractor Pipeline  |
| - DDL解析                  |
| - ORM解析                  |
| - Migration解析            |
| - アーキテクチャ推定        |
+-------------+--------------+
              |
              v
+----------------------------+
| Metadata Store (File Base) |
| - 正規化メタデータ          |
| - 検索用インデックス        |
+-------------+--------------+
              |
      +-------+--------+
      |                |
      v                v
+-------------+  +----------------+
| MCP Server  |  | Web UI Server  |
+-------------+  +----------------+
```

---

## 4. GitHub Actions 連携仕様

### 4.1 トリガー

* `push`（main / develop / 任意ブランチ）
* `pull_request`

### 4.2 処理フロー

1. リポジトリを checkout
2. プロジェクト種別を判定（言語 / フレームワーク）
3. 以下を解析

   * DDL / schema.sql
   * Migration ファイル（Flyway / Liquibase / Prisma / Rails / Alembic 等）
   * ORM 定義（例：SQLAlchemy, TypeORM, Prisma, ActiveRecord）
4. テーブル・カラム構造を抽出
5. 既存メタデータとの diff を計算
6. 変更があればメタデータを更新
7. メタデータストアへ保存

---

## 5. メタデータ生成・補完仕様

### 5.1 管理対象メタデータ

* テーブル名
* テーブルの責務・意味
* カラム名
* カラム型
* NULL 制約
* 主キー / 外部キー
* インデックス
* 推定される業務的意味

### 5.2 自動説明生成

DDL や ORM に description/comment が存在しない場合：

* カラム名・型・制約
* 周辺コードでの使用箇所
* テーブル名との関係性

をもとに LLM で説明文を生成。

生成結果は以下の属性を持つ：

* `source`: inferred | human | overridden
* `confidence`: 0.0 - 1.0

---

## 6. メタデータストア仕様

### 6.1 保存形式

* ファイルベース（Git管理可能）
* 正規化 JSON / YAML

例：

```yaml
table: orders
schema: public
description: 注文を表す集約ルート
columns:
  id:
    type: uuid
    description: 注文を一意に識別するID
    primary_key: true
  user_id:
    type: uuid
    description: 注文を行ったユーザー
    foreign_key: users.id
```

### 6.2 インデックス

検索用に以下を生成：

* テーブル名逆引き
* カラム名全文検索
* 説明文全文検索
* 型・制約別インデックス

---

## 7. MCP サーバー仕様

### 7.1 提供ツール一覧

#### list_catalog

* 利用可能なプロダクト / カタログ一覧を返す

#### list_schema

* 指定カタログ内の schema 一覧

#### list_table

* 指定 schema 内のテーブル一覧

#### get_table_schema

* テーブルの完全なスキーマ・メタデータを取得

#### update_table_metadata

* 人手または AI によるメタデータ修正
* `source=human` として保存

#### search_table (fuzzy)

* 曖昧検索対応
* 例：

  * 特定文字列を含むカラム名
  * 意味的に類似する説明

---

## 8. ファジィ検索仕様

* 部分一致（LIKE）
* 正規化文字列検索
* ベクトル検索（オプション）

  * カラム説明・テーブル説明を埋め込み化

検索例：

* 「user_id を持つテーブル」
* 「決済に関係するカラムがあるテーブル」

---

## 9. Web UI 仕様

### 9.1 提供機能

* テーブル一覧表示
* テーブル詳細ページ
* カラム定義表示
* メタデータ編集（権限付き）

### 9.2 ER 図表示

* 外部キーを元に自動生成
* Schema 単位 / 全体表示

### 9.3 技術要件（想定）

* Frontend: React / Vue / Svelte
* ER 描画: Mermaid / D3.js
* Backend: MCP Server と同一 or 別プロセス

---

## 10. 非機能要件

* 冪等性：同一コードから同一メタデータが生成される
* 追跡性：いつ・なぜ変わったかが分かる
* 拡張性：新しい DB / ORM を後付け可能
* LLM 非依存：メタデータ自体は人間可読

---

## 11. 将来拡張案

* DBT / BI ツール連携
* データリネージ表示
* API スキーマとの相互リンク
* スキーマ変更のリスク自動評価

---

## 12. まとめ

本 MCP サーバーは、

* スキーマを **構造** だけでなく **意味** として管理し
* 人と AI が共通理解を持つための基盤

として機能することを目指す。

「ドキュメントを書かなくても、ドキュメントが育つ」状態を実現することが最終ゴールである。

---

# 付録A: AIによる自動メタデータ生成プロンプト設計指針

## A.1 基本思想

AI は「創作」ではなく **推論による補完者** として振る舞う。
そのため、以下を厳守する。

* 不確実性は明示する
* 事実と推測を混同しない
* 将来人間が上書きできる前提で書く

## A.2 入力コンテキスト

AI に渡す入力は以下を最小単位とする。

* テーブル名 / スキーマ名
* カラム名 / 型 / 制約
* 外部キー情報
* 周辺コードでの使用箇所（可能な範囲）
* 既存の人手メタデータ（あれば）

## A.3 出力フォーマット（厳格）

```json
{
  "description": "説明文",
  "assumptions": ["推測内容"],
  "confidence": 0.0,
  "source": "inferred"
}
```

## A.4 プロンプトテンプレート例（概念）

* あなたはデータベース設計レビューアである
* 名前・型・制約から業務的意味を推論せよ
* 不明な点は assumptions に列挙せよ
* 確信度を 0.0〜1.0 で数値化せよ
* 事実の断定は禁止

## A.5 禁止事項

* ビジネス要件の創作
* 曖昧な形容詞のみの説明
* confidence = 1.0 の付与

---

# 付録B: MCP Tool 定義（具体案）

## B.1 list_catalog

```json
{
  "name": "list_catalog",
  "description": "利用可能なプロダクトカタログ一覧を取得",
  "input": {},
  "output": {
    "catalogs": [{ "id": "string", "name": "string" }]
  }
}
```

## B.2 list_schema

```json
{
  "name": "list_schema",
  "input": { "catalog_id": "string" },
  "output": { "schemas": ["string"] }
}
```

## B.3 list_table

```json
{
  "name": "list_table",
  "input": { "catalog_id": "string", "schema": "string" },
  "output": { "tables": ["string"] }
}
```

## B.4 get_table_schema

```json
{
  "name": "get_table_schema",
  "input": {
    "catalog_id": "string",
    "schema": "string",
    "table": "string"
  },
  "output": {
    "table": "string",
    "description": "string",
    "columns": {
      "<column>": {
        "type": "string",
        "description": "string",
        "source": "string",
        "confidence": "number"
      }
    }
  }
}
```

## B.5 update_table_metadata

```json
{
  "name": "update_table_metadata",
  "input": {
    "catalog_id": "string",
    "schema": "string",
    "table": "string",
    "patch": "object"
  },
  "output": { "status": "ok" }
}
```

## B.6 search_table (fuzzy)

```json
{
  "name": "search_table",
  "input": {
    "query": "string",
    "mode": "column|description|semantic"
  },
  "output": {
    "results": [
      { "schema": "string", "table": "string", "score": "number" }
    ]
  }
}
```

---

# 付録C: 実装TODOリスト

## C.1 MVP必須

* [ ] メタデータ保存フォーマット JSON Schema 定義
* [ ] GitHub Actions 最小パイプライン
* [ ] ORM 1種対応（Prisma / SQLAlchemy 等）
* [ ] MCP Server 基盤実装
* [ ] list / get 系 Tool 実装

## C.2 拡張

* [ ] 自動説明生成プロンプト実装
* [ ] diff ベース更新ロジック
* [ ] ファジィ検索（LIKE）
* [ ] ER 図生成（Mermaid）

## C.3 将来

* [ ] ベクトル検索
* [ ] データリネージ
* [ ] API スキーマ連携
* [ ] 変更影響スコアリング
