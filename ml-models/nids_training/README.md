# NIDS training

| Script | Data | Result |
|---|---|---|
| `train_kdd99.py` | KDD Cup 99, 10% set (downloaded by scikit-learn), duplicates removed: 145,584 rows, stratified 80/20 split | accuracy 99.97%, macro F1 96.84% (U2R F1 0.86 on 10 test rows) |
| `train.py` | NSL-KDD. Put the real `KDDTrain+.txt` / `KDDTest+.txt` from https://www.unb.ca/cic/datasets/nsl-kdd.html into `data/` first | not reported |

```bash
pip install -r requirements.txt
python train_kdd99.py
```

KDD Cup 99 is an old benchmark, so these scores are optimistic compared with live traffic.
Macro F1 is the number to watch: accuracy is dominated by the Normal and DoS classes.
