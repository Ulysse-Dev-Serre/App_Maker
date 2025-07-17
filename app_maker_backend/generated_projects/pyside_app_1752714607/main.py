import sys
import random
from PySide6.QtWidgets import QApplication, QWidget, QPushButton, QLabel, QVBoxLayout, QMessageBox
from PySide6.QtGui import QPalette, QColor

class MainWindow(QWidget):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("Random Words")
        self.setFixedSize(400, 400)

        palette = self.palette()
        palette.setColor(QPalette.Window, QColor(255, 105, 180)) # Rose
        self.setPalette(palette)

        self.label = QLabel("Click a button!", self)
        self.label.setStyleSheet("font-size: 20px;")
        self.label.setAlignment(Qt.AlignCenter)


        words = ["hello", "world", "python", "pyside", "random", "word", "button", "application", "widget", "layout"]

        buttons = []
        for i in range(4):
            button = QPushButton(f"Button {i+1}", self)
            button.clicked.connect(lambda _, i=i: self.show_random_word(words))
            buttons.append(button)

        layout = QVBoxLayout()
        layout.addWidget(self.label)
        for button in buttons:
            layout.addWidget(button)
        self.setLayout(layout)

    def show_random_word(self, words):
      self.label.setText(random.choice(words))


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())