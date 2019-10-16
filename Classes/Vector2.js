module.exports = class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    Magnitude() {
        return Math.sqrt((this.x * this.x) + (this.y * this.y));
    }

    Normalize() {
        let mag = this.Magnitude();
        return new Vector2(this.x / mag, this.y / mag);
    }

    Distance(OtherVect = Vector2) {
        let direction = new Vector2();
        direction.x = OtherVect.x - this.x;
        direction.y = OtherVect.y - this.y;
        return direction.Magnitude();
    }

    ConsoleOutput() {
        return '(' + this.x + ',' + this.y + ')';
    }
}