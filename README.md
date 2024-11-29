# Plan 2D Figma Plugin
Плагин выгружает из фрейма Figma json-файл с набором расставленных устройств, который затем используется для конфигурации интерактивного виджета Plan-2d в платформе [Inspark IoT](https://inspark.ru).

## User guide

### Установка плагина в figma

Зайдите в список релизов плагина и скачайте последний. Распакуйте скачанный архив.

В Figma в меню во вкладке с плагинами выберите: `Development > Import plugin from manifest...` и укажите файл `manifest.json` в папке с плагином.

### Работа с плагином

- сделайте копию [файла](https://www.figma.com/file/DWVbpDvW8CbiYUS1mCuCep/plan-2d-constructor?node-id=731%3A154) командой `Duplicate` в Figma и далее работайте с копией
- создайте frame, вставьте в него изображение плана
- экспортируйте фрейм как png
- добавьте на фрейм компоненты устройств, переименуйте их (только латинские буквы и цифры без пробелов)
- сгруппируйте устройства по зонам через создание одноуровневых группы (Group – `Ctrl/Cmd + G`), вложенные группы не поддерживаются
- выделите основной фрейм и запустите плагин через `Development > Plan Constructor > Export Plan Configuration File`
- сохраните json и используйте его для конфигурации виджета Plan-2d

## Plugin development

If this is your first time doing anything like this, you will need to download and install [NodeJs](https://nodejs.org/en/) first. If you're looking for a code editor, I highly recommend [VS Code](https://code.visualstudio.com/) by Microsoft. It as an build-in command line terminal and makes it really easy to get started.

### Step 1 – Clone repo
Create a copy of this project on your local drive. You can do so by downloading a zip from the green 'Clone or download' button. Or if you are already familiar with the command line, you can enter:
```bash 
git clone https://github.com/inspark/figma_plugin_2Dplan
```

### Step 2 – Install dependencies

Next you will need to run a terminal command to install this project's dependencies. If you're unfamiliar with this concept, this just downloads bunch of scripts required for the boilerplate to work properly. 

If you're using VS Code, you can `File → Open Workspace` and choose the folder where you cloned the project to. Alternatively, in OSX, you can just drag the folder from Finder onto the VS Code icon in your dock. From here you will need to open the terminal, `Terminal → New Terminal`.

Use node ```14.21.3```.

Now you can enter the command to install it:
```bash 
npm install
```

### Step 3 – Run project in dev mode

Now that you have the project and all the dependencies installed, you can start developing. To start working on your project, enter the following command into the terminal:
```bash 
npm run dev
```

This puts the project into development mode which will watch any of the files you're working on for changes. Next time you save an edit to HTML, CSS, Javascript, or add in some img assets, the plugin will automatically build a new version. Your plugin will get assembled in the `dist` directory. This is the directory you will point Figma to when installing the plugin locally.

### Step 4 – Build

Okay, so you're done creating your plugin and it's ready for use or to be submitted to Figma. What's next? There is just one more command to run. This command will build the final version of your plugin and minify all of your code, and remove any unused CSS, to reduce it down to the smallest file size possible.
```bash 
npm run build
```

### Step 5 – Commit and push changes

## FAQ

**I noticed the main plugin code is a .ts file, what's that?!**
That is a Typescript file—Typescript is a stricter way of writing Javascript that uses leverages definitions from the API you're writing code for, to help flag errors while you're writing code. On the surface, this seems like a new language that you need to learn, but it's really not. Typescript will get compiled to Javascript when you run the build, so you can just write Javascript in this file.

The good news is that this can really help you in a couple of major ways. First, the definitions in the `src/main/figma.d.ts` file will allow your code editor to autocomplete the code you're writing with suggestions specific to the Figma API. This can save you time and from making mistakes like typos. Second, the squiggly underlines or errors you get can help flag parts of your code that may break when you run it. For example, you may try to do modify something about a node the user has selected on the Figma canvas. If you tried to access a property like `cornerRadius` on a selection, Typescript would flag an error `Property 'cornerRadius' does not exist on type 'SceneNode'.`. Why? Because not every node is guaranteed to have a `cornerRadius` property. It can help you ensure that you're writing code with good error handling and type checking so that your code doesn't break. The [Figma Plugin API](https://www.figma.com/plugin-docs/typescript/) documentation has a great deep dive that goes into WAY more details.
