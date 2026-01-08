# schema-mcp-install-skillsの検証手順

このガイドでは、`schema-mcp-install-skills`がtest_python_projectで正しく動作することを確認する方法を説明します。

## 前提条件

- Node.jsがインストールされていること
- schema-mcp-serverリポジトリがチェックアウトされていること
- テスト対象のPythonプロジェクト（test_python_project）

---

## 手順1: コマンドのインストール

`schema-mcp-install-skills`コマンドをビルドしてグローバルにインストールします：

```bash
cd /path/to/schema_mcp
npm run build          # TypeScriptをコンパイルしてアセットをコピー
npm link               # コマンドをグローバルにインストールするシンボリックリンクを作成
```

コマンドが利用可能か確認します：

```bash
which schema-mcp-install-skills
# 出力例: /Users/<username>/.nodebrew/current/bin/schema-mcp-install-skills
```

---

## 手順2: スキルのインストール

テストプロジェクトのディレクトリに移動してスキルをインストールします：

```bash
cd test_python_project
schema-mcp-install-skills
```

期待される出力：
```
Installing schema-mcp skills...
✓ Skills installed to .opencode/skill/schema_mcp_skill/SKILL.md

You can now use the schema-mcp skill to extract and manage database schemas.
```

スキルファイルが作成されたことを確認します：

```bash
ls -la .opencode/skill/schema_mcp_skill/SKILL.md
```

---

## 手順3: スキルを使用してプロジェクトを解釈する

スキルがインストールされたので、opencodeのサブエージェントがこれを使用してプロジェクトを解釈し、アーティファクトを作成できます。

### 3.1. カタログ名の決定

スキル定義に従い、プロジェクトの設定ファイルを順に確認してカタログ名を決定します：

1. `package.json` → `name`フィールド
2. `pyproject.toml` → `project.name`フィールド（見つかりました: "test-python-project"）
3. `Cargo.toml` → `[package].name`フィールド
4. `composer.json` → `name`フィールド
5. カレントディレクトリ名

test_python_projectの場合、カタログ名は: `test-python-project`

### 3.2. DDLファイルの収集

プロジェクトからDDL/スキーマファイルを収集します。test_python_projectの場合：

**オプションA: SQLAlchemyモデルからDDLを生成**

```bash
cd test_python_project
python - << 'EOF'
from sqlalchemy import create_engine
from app.models import Base

engine = create_engine("sqlite:///:memory:")
Base.metadata.create_all(bind=engine)
print(Base.metadata.create_all(engine.compile(compile_kwargs={"literal_binds": True})))
EOF
```

**オプションB: models.pyから手動でスキーマを抽出**

`app/models.py`を確認してテーブル定義を抽出します：

```python
class UserClick(Base):
    __tablename__ = "user_clicks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True, nullable=False)
    click_count = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
```

**DDLファイルを作成します：**

```bash
mkdir -p .schema_mcp/test-python-project
cat > .schema_mcp/test-python-project/schema.sql << 'EOF'
CREATE TABLE user_clicks (
    id INTEGER PRIMARY KEY,
    user_id VARCHAR NOT NULL UNIQUE,
    click_count INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME
);

CREATE INDEX ix_user_clicks_id ON user_clicks(id);
CREATE INDEX ix_user_clicks_user_id ON user_clicks(user_id);
EOF
```

### 3.3. schema-mcp Pipelineを使用してメタデータを抽出

schema-mcp pipelineを実行してメタデータを抽出・保存します：

```bash
cd test_python_project
node ../dist/cli.js install --type ddl --path .schema_mcp/test-python-project/schema.sql
```

または、CLIを直接使用：

```bash
cd test_python_project
node ../dist/cli.js pipeline --catalog test-python-project
```

期待されるアーティファクト：
- `.schema_mcp/test-python-project/schema.sql` - 結合されたDDLファイル
- `.schema_mcp/test-python-project/metadata.yaml` - 抽出されたメタデータ

### 3.4. アーティファクトの確認

**DDLファイルを確認：**

```bash
cat .schema_mcp/test-python-project/schema.sql
```

期待される出力：
```sql
CREATE TABLE user_clicks (
    id INTEGER PRIMARY KEY,
    user_id VARCHAR NOT NULL UNIQUE,
    click_count INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME
);

CREATE INDEX ix_user_clicks_id ON user_clicks(id);
CREATE INDEX ix_user_clicks_user_id ON user_clicks(user_id);
```

**メタデータファイルを確認：**

```bash
cat .schema_mcp/test-python-project/metadata.yaml
```

期待される構造：
```yaml
version: "2025-01-08"
catalog: test-python-project
schema: main
tables:
  - name: user_clicks
    description: |
      ボタンカウンターアプリケーションで個々のユーザーのクリック数を追跡します。
    source: inferred
    confidence: 0.9
    columns:
      - name: id
        type: INTEGER
        description: 主キー識別子
        nullable: false
        primary_key: true
      - name: user_id
        type: VARCHAR
        description: ユーザーの一意識別子
        nullable: false
        unique: true
      - name: click_count
        type: INTEGER
        description: ユーザーがボタンをクリックした回数
        nullable: false
        default: 0
      - name: updated_at
        type: DATETIME
        description: 最後のクリック更新のタイムスタンプ
        nullable: true
```

### 3.5. MCPツールのテスト（オプション）

schema-mcpサーバーが実行中の場合、MCPツールをテストできます：

```bash
# MCPサーバーを起動
node ../dist/cli.js server

# 別のターミナルからMCPクライアントを使用してクエリ：
# - get_table_schema: user_clicksテーブルの完全なスキーマを取得
# - search_tables: テーブル/カラムを検索
# - list_catalog: 利用可能なカタログを一覧表示
# - list_tables: test-python-projectカタログ内のテーブルを一覧表示
```

---

## 手順4: クリーンアップ

インストールしたすべてのアーティファクトを削除します：

```bash
cd test_python_project
rm -rf .opencode        # インストールしたスキルを削除
rm -rf .schema_mcp      # 抽出したメタデータを削除
cd ..
npm unlink             # グローバルコマンドリンクを削除（オプション）
```

---

## 期待される結果のまとめ

これらの手順に従うと、以下が作成されます：

1. ✅ `.opencode/skill/schema_mcp_skill/SKILL.md`にインストールされたスキル
2. ✅ `.schema_mcp/test-python-project/schema.sql`に作成されたDDLファイル
3. ✅ `.schema_mcp/test-python-project/metadata.yaml`に作成されたメタデータファイル
4. ✅ MCPツールがスキーマ情報にアクセスできる状態

---

## トラブルシューティング

**コマンドが見つからない場合：**
```bash
# npm linkが正しく動作したか確認
which schema-mcp-install-skills

# 見つからない場合：
cd /path/to/schema_mcp
npm link
```

**スキルファイルが作成されない場合：**
```bash
# distディレクトリが存在し、ファイルがあるか確認
ls -la dist/skills/SKILL.md.template

# 必要に応じて再ビルド
npm run build
```

**Pipelineが失敗する場合：**
```bash
# DDLファイルが存在し、有効か確認
cat .schema_mcp/test-python-project/schema.sql

# 詳細なエラーメッセージでログを確認
node ../dist/cli.js pipeline --catalog test-python-project --verbose
```

---

## 次のステップ

検証が成功したら、以下のことができます：

1. 実際のopencodeサブエージェントワークフローでスキルを使用する
2. 異なるプロジェクトタイプ（マルチデータベースプロジェクト）でテストする
3. ORMモデルからのより包括的なDDL抽出を追加する
4. CI/CDパイプラインに統合する
