
// CV Terminal Class - Start -
class CVTerminal {
  terminal;
  isAnimating;
  command;
  addons;
  addonsConfig;
  prompt;
  promptLength;
  cursorX;
  printingFullCV;
  interrupted;
  commands;
  cvSections;
  cv;
  currentSectionIndex;
  animationFrameId;

  constructor(config) {
    this.config = config;
    this.initializeProperties();
    this.installAddons();
    this.openTerminal(this.config.container);
    this.fitTerminal();
    this.registerEvents();
    this.writeWelcomeMessage();
  }

  fitTerminal() {
    const fitAddon = this.addons["FitAddon"];
    fitAddon && fitAddon.fit();
  }

  openTerminal(container) {
    this.terminal.open(container);
    this.terminal.focus();
  }

  writeWelcomeMessage() {
    this.terminal.writeln("Hello There...");
    this.terminal.writeln("Type 'help' to see available commands.");
    this.writePrompt();
  }

  initializeProperties() {
    this.terminal = new Terminal(this.config.terminal);
    this.isAnimating = false;
    this.command = "";
    this.addons = {};
    this.addonsConfig = this.config.addons;
    this.prompt = this.config.cv.prompt;
    this.promptLength = this.prompt.length;
    this.cursorX = this.promptLength;
    this.printingFullCV = false;
    this.interrupted = false;
    this.commands = new Set(this.config.cv.commands);
    this.cvSections = new Set(this.config.cv.cvSections);
    this.cv = this.config.cv.cv;
    this.currentSectionIndex = 0;
    this.animationFrameId = -1;
  }

  installAddons() {
    this.addons = {};
    for (const addon of this.addonsConfig) {
      const addonConstructor = Object.values(addon.instance)[0];
      const addonInstance = new addonConstructor();
      this.addons[addon.instance.name] = addonInstance;
      this.terminal.loadAddon(addonInstance);
      if (addon.autoFit) {
        addonInstance.fit();
      }
    }
  }

  registerEvents() {
    this.terminal.onKey((event) => this.handleKeyEvent(event));
    window.addEventListener("resize", () => this.fitTerminal());

    document.addEventListener("click", (event) => {
      const isTerminalClick = event.composedPath().some((el) => el === this.terminal.element);
      if (isTerminalClick) {
        this.terminal.focus();
      } else if (!isTerminalClick) {
        this.terminal.blur();
      }
    });
  }

  handleKeyEvent({ key, domEvent }) {
    const isCtrlC = domEvent.ctrlKey && domEvent.key.toLowerCase() === "c";
    const isPrintable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;

    const KEYCODE = {
      Backspace: "Backspace",
      Enter: "Enter",
      ArrowUp: "ArrowUp",
      ArrowDown: "ArrowDown",
      ArrowLeft: "ArrowLeft",
      ArrowRight: "ArrowRight",
    };

    if (this.isAnimating && isCtrlC) {
      return this.interruptAnimation();
    }
    if (this.isAnimating) return;

    switch (domEvent.key) {
      case KEYCODE.Backspace:
        this.handleBackspace();
        break;
      case KEYCODE.Enter:
        this.handleReturn();
        break;
      case KEYCODE.ArrowUp:
      case KEYCODE.ArrowDown:
      case KEYCODE.ArrowLeft:
      case KEYCODE.ArrowRight:
        break;
      default:
        if (isPrintable) {
          this.handleInput(key);
        }
    }
  }

  stopAnimation() {
    this.interrupted = false;
    this.isAnimating = false;
    cancelAnimationFrame(this.animationFrameId);
    this.resetFullCV();
  }

  handleBackspace() {
    if (this.cursorX > this.promptLength) {
      this.terminal.write("\b \b");
      this.cursorX--;
    }
  }

  handleReturn() {
    this.terminal.writeln("");
    this.handleCommand();
    this.command = "";
    this.cursorX = this.promptLength;
    if (!this.isAnimating) {
      this.writePrompt();
    }
  }

  handleInput(key) {
    this.terminal.write(key);
    this.command += key;
    this.cursorX++;
  }

  writePrompt() {
    this.terminal.write(this.prompt);
  }

  handleCommand() {
    const trimmedCommand = this.command.trim();

    if (this.commands.has(trimmedCommand)) {
      switch (trimmedCommand) {
        case "help":
          this.writeHelp();
          break;
        case "fullcv":
          this.startFullCV();
          break;
        default:
          this.writeSection(trimmedCommand);
      }
    } else {
      this.terminal.writeln(" ERROR: Command not recognized: " + trimmedCommand + "!");
      this.terminal.writeln("Type 'help' to see available commands.");
    }
  }

  writeHelp() {
    let helpText = "\n  AVAILABLE COMMANDS:\n\n";
    for (const cmd of this.commands) {
      helpText += "- " + cmd + "\n";
    }

    this.isAnimating = true;
    this.animateTyping(helpText, 0, () => {
      this.isAnimating = false;
      this.writePrompt();
    });
  }

  startFullCV() {
    this.printingFullCV = true;
    this.handleFullCVCommand();
  }

  writeSection(sectionName) {
    const section = "\n  " + sectionName.toUpperCase();
    this.terminal.writeln(section);
    const commandInfo = "\r\n" + this.cv[sectionName].join('\n');

    if (this.interrupted) return;

    this.isAnimating = true;
    this.animateTyping(commandInfo, 0, () => {
      this.isAnimating = false;
      if (this.printingFullCV) {
        this.handleFullCVCommand();
      } else {
        this.writePrompt();
      }
    });
  }

  handleFullCVCommand() {
    const cvSectionsArray = Array.from(this.cvSections);

    if (this.currentSectionIndex >= cvSectionsArray.length) {
      this.resetFullCV();
      this.writePrompt();
    } else {
      this.printingFullCV = true;
      const command = cvSectionsArray[this.currentSectionIndex];
      this.currentSectionIndex++;
      this.writeSection(command);
    }
  }

  resetFullCV() {
    this.currentSectionIndex = 0;
    this.printingFullCV = false;
  }

  animateTyping(text, pos, callback) {
    if (this.interrupted) {
      return this.stopAnimation();
    }

    if (pos < text.length) {
      this.terminal.write(text.charAt(pos));
      if (text.charAt(pos) === "\n") {
        this.terminal.write("\r");
      }
      this.animationFrameId = requestAnimationFrame(() =>
        this.animateTyping(text, pos + 1, callback)
      );
    } else {
      this.terminal.writeln("\r");
      this.isAnimating = false;
      callback && callback();
    }
  }

  interruptAnimation() {
    this.stopAnimation();
    this.terminal.write("\r\n\nInterrupted\r\n\n");
    this.writePrompt();
  }
}

// Initialize the terminal 
window.onload = () => {

  const addonsConfig = [
    { instance: FitAddon, autoFit: true },
    { instance: WebLinksAddon },
  ];


  const terminalSettings = {
    "fontSize": 25,
    "fontFamily": "'VT323', monospace", // Make sure 'VT323' is loaded as shown earlier
    "cursorStyle": "block",
    "cursorBlink": true,
    "theme": {
      "background": "#000000",
      "foreground": "#00ff00",
      "cursor": "#00ff00"
    },
    "cols": 50,
    "rows": 22
  };


  const cvInteraction = {
    "commands": [
      "about",
      "experience",
      "education",
      "contact",
      "help"
    ],
    "cvSections": [
      "Kevin's about",
      "Kevin's experience",
      "Kevin's education",
      "contact"
    ],
    "cv": {
      "about": [
        "Name: Kévin Joya",
        "Job: Développeur front-end",
        "En tant que développeur front, j'ai commencé avec les basiques comme le HTML5 et CSS5 mais ayant une forte apétence pour le front, je me suis spécialisé sur le Javascript Vanilla puis j'ai évolué sur le framework React.js. Ensuite de cela, j'ai reprit mes études, une formation de développeur web, qui était en alternance et durant laquelle j'ai apprit le framework Vue.js avec lequel je joue encore aujourd'hui, accompagné de Typescript. ",
      ],
      "experience": [
        "Développeur front-end | Ecoco2 (Jan 2022 - Aujourd'hui)",
        "Localisation: Full remote",
        "Description:",
        "Sur ma première année j’étais sur la partie front d’un projet avec la moitié passée en tant que lead sur celle-ci. Sur ma seconde année, j’ai rejoint un autre projet tech, la solution Udwi, qui est une plateforme web dédiée au suivi de la consommation électrique. J’ai pour missions d’implémenter les features demandées en faisant des call API, en respectant les critères d’acceptance et les maquettes.",
        "• Livraison, déploiement (Production/Test env)",
        "• Pipeline construction, maintenance",
        "Technologies:",
        "• Cloud: AWS",
        "• VCS: Git, Gitlab",
        "• CLI Tools: yarn packages",
        "• IDEs: VS Code",
        "• Languages: HTML, CSS, SCSS, Vue 2, Vue 3, Typescript, Vuex, Vuetify, Tailwind, Python, PHP, Django",
        "• Scripting: Bash, Javascript, Python, YAML, PowerShell",
        "• Collaboration: JIRA, Confluence, Teams, Microsoft suite",
        "• Containerization: Docker",

        "Développeur front end | Bluecoders (Déc 2021 - Déc 2022)",
        "Localisation: Paris",
        "Description:",
        "Au sein de Bluecoders, j’ai passé une année à sur du Vue.js à implémenter des features servant au CRM interne, pour les commerciaux. En binôme avec un développeur back, nous avions aussi créé une feature principale, le pipe jobs, qui a était réalisé from skratch.",
        "• Pipeline construction, maintenance",
        "Technologies:",
        "• Cloud: AWS",
        "• VCS: Git, Github",
        "• CLI Tools: npm packages",
        "• IDEs: VS Code",
        "• Languages: HTML, CSS, SCSS, Vue 2, Vuex, Vuetify, Node.js",
        "• Scripting: Bash, Javascript, PowerShell",
        "• Collaboration: Notion, Slack, Gmail",
        "• Containerization: Docker",

        "Développeur web | PurchEase (Mai 2019 - Sep 2019)",
        "Localisation: Paris",
        "Description:",
        "J’avais pour missions d’agir sur le CRM interne de la société qui était en Ruby On Rails pour intégrer les fonctionnalités permettant l’utilisation des outils de leur logiciel.De plus, j’avais une mission où j’avais apprit le Vue.js pour réaliser une timeline qui était un projet client.",
        "Technologies:",
        "• VCS: Git, Github",
        "• IDEs: VS Code",
        "• Languages: HTML, CSS, SCSS, Vue, Vuex, Vuetify, Ruby on rails",
        "• Scripting: Bash, Javascript, PowerShell",
        "• Collaboration: Slack, Gmail",
      ],

      "education": [
        "3WAcademy - Développeur web",
        "Ecole 42 - Bootcamp",
        "Le Wagon - Bootcamp",
        "OpenClassromm - Développeur web",
      ],
      "contact": [
        "LinkedIn: https://www.linkedin.com/in/kévin-joya-5b6250133",
        "GitHub: https://github.com/Kvin3324",
      ]
    },
    "prompt": "root > "
  };


  const terminalConfigurations = {
    terminal: terminalSettings,
    cv: cvInteraction,
    addons: addonsConfig,
    container: document.querySelector("#terminal"),
  };

  new CVTerminal(terminalConfigurations);
}
