from . import models

def seed(db):
    if db.query(models.Train).count(): return
    for n, name, s, d, dep, arr in [("12301", "Rajdhani Express", "Delhi", "Kolkata", "16:55", "10:00"), ("12951", "Mumbai Rajdhani", "Delhi", "Mumbai", "16:35", "08:35")]:
        t = models.Train(number=n, name=name, source=s, destination=d, departure=dep, arrival=arr); db.add(t); db.flush()
        for cls, fare in (("SL", 700), ("3A", 1800)):
            for i in range(1, 13): db.add(models.Seat(train_id=t.id, cls=cls, number=str(i), fare=fare))
    db.commit()
