
# 认识 Python

Python 是一种易学、功能强大的高级编程语言，广泛用于脚本编写、自动化、Web 后端、数据分析、机器学习等领域。语法简洁、生态丰富，是初学者和工程师常选语言。

---

## 1. 安装与版本

- 官方下载地址：https://www.python.org/downloads/
- 推荐使用 Python 3.8+（目前常用为 3.10/3.11/3.12 等）。
- Windows 用户可选择官方安装程序或微软商店，建议勾选“Add Python to PATH”。

验证安装：打开命令行或 PowerShell，运行：

```powershell
python --version
pip --version
```

若系统存在 `python` 与 `python3` 两个命令，请以 `python --version` 为准，必要时使用 `py -3`（Windows 启动器）。

## 2. 虚拟环境（推荐）

使用虚拟环境可以为每个项目隔离依赖：

```powershell
python -m venv .venv
.
# Windows PowerShell 激活
.\.venv\Scripts\Activate.ps1
# CMD 激活
.\.venv\Scripts\activate.bat
```

或使用 `pipenv` / `poetry` 管理项目依赖与虚拟环境。

## 3. 包管理（pip）

安装依赖：

```powershell
pip install requests
pip install -r requirements.txt
```

生成依赖列表：

```powershell
pip freeze > requirements.txt
```

## 4. 第一个脚本

创建 `hello.py`：

```python
def main():
	print("Hello, Python!")

if __name__ == '__main__':
	main()
```

运行：

```powershell
python hello.py
```

## 5. 常用库与场景

- 网络请求：`requests`
- 数据处理：`pandas`, `numpy`
- Web 开发：`Flask`, `Django`, `FastAPI`
- 测试：`pytest`, `unittest`
- 科学计算/机器学习：`scikit-learn`, `tensorflow`, `pytorch`

## 6. 在 VSCode 中开发 Python

- 安装 VSCode 官方 `Python` 扩展，启用语言服务、调试与虚拟环境自动识别。
- 推荐同时安装 `Pylance`（类型提示）和 `isort`/`black`（格式化）。
- 在工作区中选择解释器：`Ctrl+Shift+P` → `Python: Select Interpreter` → 选择 `.venv`。

调试示例：在 `hello.py` 中设置断点，按 `F5` 启动调试。

## 7. 调试与排查技巧

- 使用 `print` 或 `logging` 输出调试信息；在生产环境使用 `logging` 替代 `print`。
- 常见问题：依赖未安装、虚拟环境未激活、Python 路径未配置（检查 `python --version` 与 VSCode 解释器）。
- 格式化与静态检查：使用 `black`、`flake8`、`mypy` 提升代码质量。

## 8. 学习建议与资源

- 官方文档：https://docs.python.org/3/
- 在线教程：菜鸟教程、廖雪峰 Python 教程、Real Python
- 练习平台：LeetCode、HackerRank、Project Euler

---

> 小结：尽快动手写小项目、使用虚拟环境并养成单元测试和代码格式化习惯。

