@echo off
echo 🚀 Building AI Agent Studio Extension...

REM Clean previous builds
echo 🧹 Cleaning previous builds...
if exist out rmdir /s /q out
if exist dist rmdir /s /q dist
if exist *.vsix del *.vsix

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

REM Lint the code
echo 🔍 Linting code...
call npm run lint

REM Compile TypeScript
echo ⚙️ Compiling TypeScript...
call npm run compile

REM Run tests
echo 🧪 Running tests...
call npm run test

REM Package the extension
echo 📦 Packaging extension...
call npm run package

echo ✅ Build completed successfully!
echo 📦 Extension packaged as: ai-agent-studio-1.0.0.vsix
echo.
echo 🎉 To install the extension:
echo    code --install-extension ai-agent-studio-1.0.0.vsix
echo.
echo 🔧 To publish the extension:
echo    vsce publish

pause