import sys
from PySide6.QtWidgets import QApplication, QWidget, QPushButton, QLabel, QVBoxLayout, QMessageBox
from PySide6.QtGui import QColor
from random import randint

class ColorWindow(QWidget):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("Color App")
        self.setGeometry(100, 100, 400, 400)

        self.layout = QVBoxLayout()

        self.color_label = QLabel()
        self.color_label.setStyleSheet("background-color: white; border: 1px solid black;")
        self.color_label.setFixedSize(300, 300)
        self.layout.addWidget(self.color_label)

        self.button = QPushButton("Changer la couleur")
        self.button.clicked.connect(self.change_color)
        self.layout.addWidget(self.button)

        self.setLayout(self.layout)

    def change_color(self):
        r = randint(0, 255)
        g = randint(0, 255)
        b = randint(0, 255)
        color = QColor(r, g, b)
        self.color_label.setStyleSheet(f"background-color: rgb({r}, {g}, {b}); border: 1px solid black;")


def main():
    app = QApplication(sys.argv)
    window = ColorWindow()
    window.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()